#!/usr/bin/env python3
"""Tests for the pure-logic seams: quote stripping, status buckets, the HTML
sanitizer, message parsing, and DB rollups/merge.

Run with:  python3 -m unittest discover tests -v
"""
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

# Isolate the test run from the real database BEFORE importing the app code.
_TMP = tempfile.mkdtemp(prefix="ct-test-")
os.environ["CT_DATA_DIR"] = _TMP
os.environ["CT_TOKEN_FILE"] = str(Path(_TMP) / "token.json")
os.environ["CT_CREDENTIALS_FILE"] = str(Path(_TMP) / "credentials.json")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import db                    # noqa: E402
import gmail_client          # noqa: E402
from app import sanitize_note_html  # noqa: E402


NOW = int(time.time())


def contact_row(**over):
    """A contacts row as a dict (bucket_for accesses by key)."""
    base = {
        "email": "x@acme.com", "last_direction": "out", "status_override": None,
        "archived": 0, "replied": 0, "next_call_at": None, "last_call_at": None,
        "call_hidden": 0, "follow_up_at": None, "last_message_at": NOW - 3600,
    }
    base.update(over)
    return base


class TestStripQuoted(unittest.TestCase):
    def test_gt_quotes_cut(self):
        out = gmail_client.strip_quoted("Thanks!\n> earlier message\n> more")
        self.assertEqual(out, "Thanks!")

    def test_wrapped_english_attribution(self):
        text = "See attached.\nOn Mon, Jun 2, 2026 at 10:01\nJane Doe <j@a.com>\nwrote:\nold stuff"
        self.assertEqual(gmail_client.strip_quoted(text), "See attached.")

    def test_italian_attribution(self):
        text = "Perfetto, grazie.\nIl giorno lun 2 giu 2026 alle 10:00 Mario\nha scritto:\nvecchio testo"
        self.assertEqual(gmail_client.strip_quoted(text), "Perfetto, grazie.")

    def test_outlook_header_block(self):
        text = "Done.\nFrom: bob@corp.com\nSent: Monday"
        self.assertEqual(gmail_client.strip_quoted(text), "Done.")

    def test_no_quotes_passthrough(self):
        self.assertEqual(gmail_client.strip_quoted("Just a line."), "Just a line.")

    def test_on_without_wrote_kept(self):
        # 'On Friday we can meet' is content, not an attribution.
        text = "On Friday we can meet.\nBest, A"
        self.assertEqual(gmail_client.strip_quoted(text), text)


class TestBuckets(unittest.TestCase):
    def test_needs_reply_wins_over_call(self):
        r = contact_row(last_direction="in", next_call_at=NOW + 9999)
        self.assertEqual(db.bucket_for(r), "needs_reply")

    def test_scheduled(self):
        r = contact_row(next_call_at=NOW + 9999)
        self.assertEqual(db.bucket_for(r), "scheduled")

    def test_called(self):
        r = contact_row(last_call_at=NOW - 9999)
        self.assertEqual(db.bucket_for(r), "called")

    def test_waiting_vs_no_reply(self):
        self.assertEqual(db.bucket_for(contact_row(replied=1)), "waiting")
        self.assertEqual(db.bucket_for(contact_row(replied=0)), "no_reply")

    def test_snoozed_hides_until_due(self):
        r = contact_row(replied=1, follow_up_at=NOW + 86400)
        self.assertEqual(db.bucket_for(r), "snoozed")
        # once due, back to the normal bucket + flagged due
        r = contact_row(replied=1, follow_up_at=NOW - 60)
        self.assertEqual(db.bucket_for(r), "waiting")
        self.assertTrue(db.is_due(r, "waiting"))

    def test_inbound_overrides_snooze(self):
        r = contact_row(last_direction="in", follow_up_at=NOW + 86400)
        self.assertEqual(db.bucket_for(r), "needs_reply")

    def test_archived_with_upcoming_call_surfaces(self):
        r = contact_row(archived=1, next_call_at=NOW + 9999)
        self.assertEqual(db.bucket_for(r), "scheduled")
        r = contact_row(archived=1)
        self.assertEqual(db.bucket_for(r), "archived")

    def test_overdue_needs_reply_is_due(self):
        r = contact_row(last_direction="in",
                        last_message_at=NOW - 5 * 86400)
        self.assertTrue(db.is_due(r, db.bucket_for(r)))
        r = contact_row(last_direction="in", last_message_at=NOW - 3600)
        self.assertFalse(db.is_due(r, db.bucket_for(r)))


class TestSanitizer(unittest.TestCase):
    def test_strips_script(self):
        out = sanitize_note_html("<p>hi</p><script>alert(1)</script>")
        self.assertEqual(out, "<p>hi</p>")

    def test_strips_event_handlers(self):
        out = sanitize_note_html('<p onclick="evil()">hi</p>')
        self.assertEqual(out, "<p>hi</p>")

    def test_blocks_js_urls(self):
        out = sanitize_note_html('<a href="javascript:evil()">x</a>')
        self.assertEqual(out, "<a>x</a>")

    def test_keeps_safe_href_and_formatting(self):
        out = sanitize_note_html('<h2>T</h2><ul><li><b>x</b></li></ul>'
                                 '<a href="https://a.com">l</a>')
        self.assertIn("<h2>T</h2>", out)
        self.assertIn("<li><b>x</b></li>", out)
        self.assertIn('href="https://a.com"', out)

    def test_filters_style_props(self):
        out = sanitize_note_html(
            '<p style="font-weight:700; background:url(http://x)">a</p>')
        self.assertIn("font-weight:700", out)
        self.assertNotIn("url(", out)

    def test_escapes_text(self):
        out = sanitize_note_html("<p>a < b & c</p>")
        self.assertIn("a &lt; b &amp; c", out)

    def test_unwraps_unknown_tags(self):
        out = sanitize_note_html("<table><tr><td>cell</td></tr></table>")
        self.assertEqual(out, "cell")


def _payload(headers, body="hello", parts=None):
    import base64
    data = base64.urlsafe_b64encode(body.encode()).decode()
    p = {"mimeType": "text/plain", "headers": headers, "body": {"data": data}}
    if parts:
        p["parts"] = parts
    return p


class TestThreadParsing(unittest.TestCase):
    MY = "me@my.com"

    def _full(self, frm, to, cc="", extra_headers=()):
        headers = [{"name": "From", "value": frm},
                   {"name": "To", "value": to},
                   {"name": "Subject", "value": "Hi"}]
        if cc:
            headers.append({"name": "Cc", "value": cc})
        headers.extend(extra_headers)
        return {"messages": [{"id": "m1", "internalDate": "1700000000000",
                              "snippet": "s", "payload": _payload(headers)}]}

    def test_outbound_contact_is_first_recipient(self):
        full = self._full(f"Me <{self.MY}>", "Jane <jane@acme.com>, bob@x.com")
        rows = gmail_client._thread_to_rows(full, "t1", self.MY)
        self.assertEqual(rows[0]["direction"], "out")
        self.assertEqual(rows[0]["contact_email"], "jane@acme.com")
        # the second recipient is linked as an extra contact
        self.assertIn(("", "bob@x.com"),
                      [(n, e) for n, e in rows[0]["extra_contacts"]])

    def test_inbound_contact_is_sender_and_cc_linked(self):
        full = self._full("Jane <jane@acme.com>", f"Me <{self.MY}>",
                          cc="Carl <carl@acme.com>")
        rows = gmail_client._thread_to_rows(full, "t1", self.MY)
        self.assertEqual(rows[0]["direction"], "in")
        self.assertEqual(rows[0]["contact_email"], "jane@acme.com")
        self.assertEqual([e for _, e in rows[0]["extra_contacts"]],
                         ["carl@acme.com"])

    def test_bulk_detection(self):
        full = self._full("news@letter.com", f"Me <{self.MY}>",
                          extra_headers=[{"name": "List-Unsubscribe",
                                          "value": "<mailto:u@x>"}])
        rows = gmail_client._thread_to_rows(full, "t1", self.MY)
        self.assertEqual(rows[0]["is_bulk"], 1)

    def test_company_from_domain(self):
        self.assertEqual(gmail_client._company_from_domain("acme.com"), "Acme")
        self.assertEqual(gmail_client._company_from_domain("gmail.com"), "")

    def test_attachment_names(self):
        payload = {"filename": "", "parts": [
            {"filename": "deck.pdf"}, {"filename": "", "parts": [
                {"filename": "model.xlsx"}]}]}
        self.assertEqual(gmail_client._attachment_names(payload),
                         ["deck.pdf", "model.xlsx"])


class TestDbRoundtrip(unittest.TestCase):
    """Real (temp) SQLite: rollups, FTS search, merge, overview."""

    @classmethod
    def setUpClass(cls):
        db.init_db()
        conn = db.get_conn()
        msgs = [
            dict(id="a1", thread_id="t1", contact_email="jane@acme.com",
                 from_email="jane@acme.com", to_emails="me@my.com",
                 subject="Pricing", snippet="snip", body_text="about the pricing model",
                 direction="in", ts=NOW - 100),
            dict(id="a2", thread_id="t2", contact_email="old@acme.com",
                 from_email="me@my.com", to_emails="old@acme.com",
                 subject="Intro", snippet="snip2", body_text="cold intro",
                 direction="out", ts=NOW - 200),
        ]
        for m in msgs:
            db.upsert_message(conn, m)
        db.upsert_contact(conn, "jane@acme.com", "Jane", "Acme", "acme.com")
        db.upsert_contact(conn, "old@acme.com", "Old Jane", "Acme", "acme.com")
        conn.commit()
        db.recompute_rollups(conn)
        conn.close()

    def test_rollups(self):
        c = db.get_contact("jane@acme.com")
        self.assertEqual(c["last_direction"], "in")
        self.assertEqual(c["status"], "needs_reply")

    def test_overview_counts_and_search(self):
        contacts, counts, _ = db.overview("all", q="pricing")
        self.assertEqual(counts["needs"], 1)
        self.assertEqual([c["email"] for c in contacts], ["jane@acme.com"])

    def test_user_edits_survive_sync(self):
        db.set_profile("jane@acme.com", name="Jane Edited", tags="vip, milan")
        conn = db.get_conn()
        db.upsert_contact(conn, "jane@acme.com", "Jane Auto", "Acme", "acme.com")
        conn.commit()
        conn.close()
        c = db.get_contact("jane@acme.com")
        self.assertEqual(c["name"], "Jane Edited")
        self.assertEqual(c["tags"], "vip, milan")

    def test_merge_moves_messages_and_files_future_mail(self):
        c2 = db.get_contact("old@acme.com")
        self.assertEqual(c2["status"], "no_reply")  # cold outreach pre-merge
        ok = db.merge_contact("old@acme.com", "jane@acme.com")
        self.assertTrue(ok)
        self.assertIsNone(db.get_contact("old@acme.com"))
        conv = db.get_conversation("jane@acme.com")
        self.assertEqual({m["id"] for m in conv}, {"a1", "a2"})
        self.assertEqual(db.get_aliases().get("old@acme.com"), "jane@acme.com")


if __name__ == "__main__":
    unittest.main()
