// Minimal markdown -> HTML for chat bubbles (bold, italics, code, headings,
// lists, links). Escapes all HTML first, so model output can't inject markup.
function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // fenced code blocks first (protect their contents behind a sentinel)
  const blocks = [];
  src = src.replace(/```([\s\S]*?)```/g, (_, code) => {
    blocks.push('<pre><code>' + esc(code.replace(/^\w*\n/, '')) + '</code></pre>');
    return '\u0000' + (blocks.length - 1) + '\u0000';
  });

  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
             '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const lines = src.split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };

  for (const line of lines) {
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) {
      closeList();
      const h = Math.min(m[1].length + 1, 3);
      out.push('<h' + h + '>' + inline(m[2]) + '</h' + h + '>');
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>' + inline(m[1]) + '</li>');
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>' + inline(m[1]) + '</li>');
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push('<p>' + inline(line) + '</p>');
    }
  }
  closeList();
  return out.join('\n').replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[+i] || '');
}
