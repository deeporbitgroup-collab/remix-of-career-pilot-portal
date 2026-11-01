// Short "who they are / what they do" line for each curated mentor (see
// curatedMentors.ts for the id roster). LinkedIn itself cannot be scraped
// (public profile pages return an anti-bot block, no logged-out access), so
// this is sourced from each mentor's own self-reported data on the
// CareerBoost platform (profiles.company_name / company_2 /
// professional_experiences / about_data) — the same information they
// entered about themselves, and more current than a one-off LinkedIn read
// would be. Kept separate from Supabase because this is editorial copy, not
// user-editable profile data.
//
// Compiled/verified against Supabase profiles data August 2026. Not every
// mentor has enough self-reported data for a confident bio (no company,
// role, or about info on file) — those ids are simply omitted here, and the
// UI falls back to sector/university in that case. Re-verify against
// current profiles data before reusing if this file is more than a few
// months old.
export const MENTOR_BIOS: Record<string, string> = {
  "d07354c3-d356-4589-b88d-34af01eb0659": // Adam Aslam
    "Investment Banking Analyst at HSBC, having converted from the firm's Summer Analyst programme to its Full-Time Graduate Analyst Programme, with prior experience at Symmetry Corporate Finance.",
  "38948a46-bef9-4097-88ac-6fb950b51983": // Alejandro Fernandez Hortal
    "Works at Deutsche Bank in London with a private banking background, pursuing a Master's in Financial Analysis at London Business School after studying at Universitat Pompeu Fabra.",
  "d4bad5a3-f4aa-4c34-bbdb-e6b18f21b7fb": // Alessandro Olivetti
    "Currently at BlackRock, previously in investment banking at J.P. Morgan. Studied at SKEMA Business School after a bachelor's at Università degli Studi di Milano-Bicocca.",
  "80fe19ad-bd96-4316-b6f0-5c8f064f7a04": // Andrea Alivernini
    "Currently at Bain & Company in Boston, previously a Venture Capital Analyst at Innovis VC and a Venture Scout at Flashpoint. Studied at ESCP Business School and MIT.",
  "b6234538-5532-4d7f-bd4d-2c593969fe2d": // Antoine Falch
    "Investment Banking Analyst at J.P. Morgan, with prior experience at Rothschild & Co and a Master in Finance from ESCP Business School.",
  "5cfebc7f-546e-4c3e-8712-fa801727b8d7": // Armand Passillier
    "Investment Banking Analyst in Acquisition Leveraged Finance at Crédit Agricole CIB, previously in the firm's Debt Capital Markets team; Master's student at ESCP Business School.",
  "1f9d9258-8f96-4871-9782-5c4912c7e288": // Arturo Alaimo
    "Works in asset management at Nevastar Finance, previously at 9fin. Studied at the University of Pisa and completed a Master's at Heriot-Watt University.",
  "5b9f765f-d006-426c-8efa-270e00b52e50": // Ascanio Figarolo di Gropello
    "Works in investment banking at Leonardo Capital SIM, having studied at Maastricht University.",
  "c3ed7637-bee3-4b0a-ae5b-bde26c45f70e": // Ben Preece
    "Incoming Investment Graduate at Schroders in Equity Research/Asset Management, with prior experience at Walter Scott; MA Economics & Management student at the University of St Andrews.",
  "fa7960e4-aced-419c-9a42-2228462334c5": // Carlo Giuseppe Antonio Marigliano
    "Works in corporate law at Dentons, having studied at Bocconi University.",
  "6e584680-08dc-4ac5-8f0a-31f3a6a669d8": // Cesare Carlucci Pieri
    "Works in private equity at DVR Capital, having studied at Bocconi University.",
  "7d9518aa-6221-4c26-9f4b-9bc982ef6326": // Elisabetta Fabris
    "Works in global markets at Euronext, with prior experience at KeyValue; studied Economics and Finance at Bocconi University.",
  "c8e64191-c5a7-482c-bbe9-55641245817e": // Gianluca De Goyzueta
    "Works in investment banking at Piper Sandler, previously in consulting at Accenture (Banking & Digital Services). Studied Finance at ESCP Business School.",
  "aac56fcd-78b4-40de-8fd7-8292127580b2": // Gianmarco Picozzi
    "Works at Cyrus Capital Partners in hedge funds, after studying at Bocconi University for both his bachelor's and master's.",
  "235c91e9-491e-4c84-b244-bb9b0c9f688d": // Gregorio Fassio
    "Final-year Corporate Finance student at ESCP Business School, part of the founding team at Louverdi, an early-stage startup, with prior experience at AON.",
  "baa9b13e-0949-4b8c-98f4-5c9d9b949635": // Killian Wabi
    "Works in consulting at KPMG, with prior experience at Africa Link Capital Titrisation, studying between HEC Montréal and Skema Business School.",
  "f995d43f-0f58-4c47-b55c-ffba4767dd9c": // Kitty Farrell
    "Works at Goldman Sachs in London, previously a Summer Analyst at Rothschild & Co. Studied at the University of Birmingham.",
  "d6730bf9-bc9e-49f3-a1b1-896da45d4be8": // Kyan Cassidy
    "Works in investment banking at Morgan Stanley, with prior audit experience at BDO; studied at Queen's University Belfast.",
  "4da5d163-209e-41d0-a80c-0f8cc8335942": // Leone Fassio
    "Currently at Acer Tree, a hedge fund, previously in wealth management at Nevastar Finance. Studied at ESCP Business School and Maastricht University.",
  "d48d57da-7552-4987-bd5c-7c1bf7817614": // Livia Segatori
    "Currently at Deloitte, with a focus on quantitative finance, following studies at Luiss Guido Carli and a Master's at Bocconi.",
  "1485f698-dbba-49c5-b2c6-d3f213d18925": // Lohan Marciano
    "Works in investment banking at BNP Paribas, with experience in financial markets at Square Global Markets; studied at ESCP Business School and ESSEC Business School.",
  "2f1803c9-cb68-479b-ad25-1fcf3cfd0e18": // Lorenzo Fruttero
    "Works at Argo with a focus on quantitative finance, after studying Economics and Finance at Bocconi University and a Master's at ESCP Business School.",
  "b3d7dd18-1286-4e9f-bcd3-7430ea9b79ad": // Louis Ashford
    "BSc Economics student at the London School of Economics, working in consulting at EY.",
  "d3c0e2ce-1ccc-4317-b09c-7e0db8f2dcc5": // Luca Tissone
    "MiM graduate of ESCP Business School with professional experience at Accenture and Agicap in consulting and fintech.",
  "6116fbf9-bc00-465f-b233-3735ddb6c06b": // Nicolò Pietro Zanussi
    "Works in asset management at Azimut, after studying at Università Cattolica del Sacro Cuore.",
  "12a629f9-4504-4844-9f2c-208aef10daeb": // Paolo Arnanno
    "M&A and Corporate Finance professional at Deloitte, alumnus of Università Cattolica del Sacro Cuore.",
  "8f918069-bf53-4aa4-9f7d-588e8f5cd798": // Pietro Cerina
    "Works in investment banking at Natixis, with prior consulting experience at Ernst & Young; studied at ESCP Business School.",
  "e532fa10-1a48-4963-8efe-e2a90b304681": // Pietro Garibbo
    "Works in consulting at Deloitte, after studying at Bocconi University for both his bachelor's and master's.",
  "a074a3a1-4146-4a99-a5a2-bc6328605139": // Riccardo Rubolino
    "Works in investment banking at J.P. Morgan, with prior consulting experience at KPMG; studied at Luiss Guido Carli and Bocconi University.",
  "7a67b6b3-5fc4-4eb0-b659-fc6f34137034": // Riccardo Ciardelli
    "Works in private equity at Synova, with prior experience at Obsidian Capital; background at ESCP Business School.",
  "b9d11191-2580-4d36-8881-ff64dab85d8c": // Sergi De Francisco
    "Investment Banking Summer Analyst at PJT Partners in London, with prior experience at Socios Corporate Finance; ESADE alumnus.",
  "7b979393-900a-4b53-9708-58dad419fbe0": // Siddhart Cross
    "Works in investment banking at Lazard, having studied at Oxford University.",
  "6addf5e4-c787-4e7e-82b7-81024bd6c8fb": // Thibaud Van Landuyt
    "Investment Banking Off-Cycle Analyst at Macquarie Group, following an Investment Banking Summer Analyst internship at Citi; Master in Finance student at ESCP Business School.",
  "cabe777e-be13-4c13-a451-d144cad244e3": // Thomas Andreis
    "Works in strategy consulting at EY-Parthenon, having studied at the Technical University of Munich and Columbia University.",
  // Omitted (no company/role/about data on file to build an accurate bio from):
  // Mateo Tarazi, Riccardo Cerimele, Riccardo Fassio
};

// Italian versions for the mentors shown in the Talent Pool "Boost Resources"
// section (shown when the Talent Pool is in Italian; English above otherwise).
export const MENTOR_BIOS_IT: Record<string, string> = {
  "d4bad5a3-f4aa-4c34-bbdb-e6b18f21b7fb": // Alessandro Olivetti
    "Attualmente in BlackRock, in precedenza in investment banking da J.P. Morgan. Ha studiato alla SKEMA Business School dopo la triennale all'Università degli Studi di Milano-Bicocca.",
  "a074a3a1-4146-4a99-a5a2-bc6328605139": // Riccardo Rubolino
    "Lavora in investment banking da J.P. Morgan, con una precedente esperienza in consulenza da KPMG; ha studiato alla Luiss Guido Carli e all'Università Bocconi.",
  "b6234538-5532-4d7f-bd4d-2c593969fe2d": // Antoine Falch
    "Investment Banking Analyst da J.P. Morgan, con una precedente esperienza da Rothschild & Co e un Master in Finance alla ESCP Business School.",
  "c8e64191-c5a7-482c-bbe9-55641245817e": // Gianluca De Goyzueta
    "Lavora in investment banking da Piper Sandler, in precedenza in consulenza da Accenture (Banking & Digital Services). Ha studiato Finance alla ESCP Business School.",
  "f995d43f-0f58-4c47-b55c-ffba4767dd9c": // Kitty Farrell
    "Lavora in Goldman Sachs a Londra, in precedenza Summer Analyst da Rothschild & Co. Ha studiato alla University of Birmingham.",
  "1f9d9258-8f96-4871-9782-5c4912c7e288": // Arturo Alaimo
    "Lavora in asset management da Nevastar Finance, in precedenza in 9fin. Ha studiato all'Università di Pisa e ha conseguito un Master alla Heriot-Watt University.",
  "4da5d163-209e-41d0-a80c-0f8cc8335942": // Leone Fassio
    "Attualmente in Acer Tree, un hedge fund, in precedenza in wealth management da Nevastar Finance. Ha studiato alla ESCP Business School e alla Maastricht University.",
  "12a629f9-4504-4844-9f2c-208aef10daeb": // Paolo Arnanno
    "Professionista M&A e Corporate Finance in Deloitte, alumnus dell'Università Cattolica del Sacro Cuore.",
  "80fe19ad-bd96-4316-b6f0-5c8f064f7a04": // Andrea Alivernini
    "Attualmente in Bain & Company a Boston, in precedenza Venture Capital Analyst in Innovis VC e Venture Scout in Flashpoint. Ha studiato alla ESCP Business School e al MIT.",
  "e532fa10-1a48-4963-8efe-e2a90b304681": // Pietro Garibbo
    "Lavora in consulenza in Deloitte, dopo triennale e magistrale all'Università Bocconi.",
  "d3c0e2ce-1ccc-4317-b09c-7e0db8f2dcc5": // Luca Tissone
    "Laureato al MiM della ESCP Business School, con esperienze professionali in Accenture e Agicap tra consulenza e fintech.",
  "7a67b6b3-5fc4-4eb0-b659-fc6f34137034": // Riccardo Ciardelli
    "Lavora in private equity in Synova, con una precedente esperienza in Obsidian Capital; ha studiato alla ESCP Business School.",
};
