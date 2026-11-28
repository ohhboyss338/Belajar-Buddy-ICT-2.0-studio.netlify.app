import type { SyllabusTopic } from '../../shared/types.ts';

export const SYLLABUS_TOPICS: SyllabusTopic[] = [
  {
    id: 1,
    title: 'Types and components of computer systems',
    subtitle: 'Hardware, software, internal architecture, OS, computer types & emerging tech',
    branches: [
      {
        id: 't1-1',
        code: '1.1',
        title: 'Hardware and software',
        summary:
          'Distinguish physical computer components (hardware) from programs and data (software), including internal vs external devices and application vs system software.',
        keyPoints: [
          'Internal hardware includes motherboard, CPU (processor), RAM, ROM, graphics/video card, sound card, NIC, and internal SSD/HDD.',
          'External hardware covers peripherals like monitors, keyboards, mice, printers, and external drives.',
          'Application software lets users perform tasks (word processing, spreadsheets, databases, CAD, photo/video editing, control & measuring).',
          'System software manages hardware and runs applications (operating systems, device drivers, utilities, compilers, linkers).'
        ],
        examTip:
          'Never call an operating system hardware or a CPU software; always state whether software is system or application when asked to classify.',
        keywords: ['Motherboard', 'NIC', 'Compiler', 'Linker', 'Device driver', 'Utility']
      },
      {
        id: 't1-2',
        code: '1.2',
        title: 'Main components of computer systems',
        summary:
          'Understand how the CPU, primary memory (RAM and ROM), and backing storage work together during the fetch-decode-execute cycle.',
        keyPoints: [
          'CPU executes instructions using the Control Unit (CU), Arithmetic Logic Unit (ALU), and registers.',
          'RAM is volatile read/write memory holding active OS, programs, and current user data; contents vanish when power is off.',
          'ROM is non-volatile read-only memory storing permanent start-up instructions (BIOS/bootstrap loader).',
          'Backing storage (HDD/SSD) provides high-capacity non-volatile retention for OS, programs, and files.'
        ],
        examTip:
          'Compare RAM vs ROM using volatility, editability, and exact purpose (active data vs BIOS boot instructions).',
        keywords: ['CPU', 'ALU', 'Control Unit', 'RAM', 'ROM', 'Volatile', 'BIOS']
      },
      {
        id: 't1-3',
        code: '1.3',
        title: 'Operating systems',
        summary:
          'Explore user interfaces (CLI, GUI, dialogue-based, gesture-based) and how the OS manages resources, security, and multitasking.',
        keyPoints: [
          'CLI requires typed commands; uses minimal RAM/CPU and lets technicians run scripts directly, though commands must be memorised.',
          'GUI uses WIMP (Windows, Icons, Menus, Pointer); intuitive for beginners without memorising syntax, at higher memory cost.',
          'Dialogue-based interfaces accept spoken natural-language commands (smart speakers, in-car assistants).',
          'Gesture-based interfaces interpret body/hand/finger movement via cameras or touchscreens (pinch, swipe, motion sensors).'
        ],
        examTip:
          'Give clear advantages AND disadvantages for CLI vs GUI tied to the user type (expert technician vs novice user).',
        keywords: ['CLI', 'GUI', 'WIMP', 'Dialogue-based', 'Gesture-based', 'Multitasking']
      },
      {
        id: 't1-4',
        code: '1.4',
        title: 'Types of computer',
        summary:
          'Compare desktop PCs, laptops, tablets, smartphones, and phablets across portability, input methods, battery life, and upgradeability.',
        keyPoints: [
          'Desktop PCs offer high performance, large screens, easy hardware upgrades, and stable mains power, but lack portability.',
          'Laptops combine display, keyboard, trackpad, and battery in a portable clamshell.',
          'Tablets use virtual keyboards, touchscreens, and sensors; lighter and faster to wake than laptops but less suited for heavy typing.',
          'Smartphones are pocket-sized connected devices with cellular/Wi-Fi, GPS, and cameras, though limited by small screen and battery.'
        ],
        examTip:
          'Match computer choice to the scenario (e.g., long essay writing suits a laptop/desktop; field inspection suits a tablet).',
        keywords: ['Desktop', 'Laptop', 'Tablet', 'Smartphone', 'Portability', 'Touchscreen']
      },
      {
        id: 't1-5',
        code: '1.5',
        title: 'Emerging technologies',
        summary:
          'Evaluate Artificial Intelligence (AI), Extended Reality (VR and AR), and their real-world impacts on learning, medicine, industry, and society.',
        keyPoints: [
          'AI simulates human intelligence to recognise patterns, learn from data, drive autonomous vehicles, and support medical diagnosis.',
          'Virtual Reality (VR) immerses users in a completely computer-generated 3D environment using headsets and motion controllers.',
          'Augmented Reality (AR) overlays digital graphics or information onto the real physical world in real time.',
          'Ethical concerns include algorithmic bias, deepfakes, data privacy, and displacement of routine jobs.'
        ],
        examTip:
          'Always separate VR (100% synthetic virtual world) from AR (real world enhanced with digital overlays).',
        keywords: ['AI', 'Virtual Reality', 'Augmented Reality', 'Autonomous', 'Machine Learning']
      }
    ]
  },
  {
    id: 2,
    title: 'Input and output devices',
    subtitle: 'Manual input devices, direct data entry (DDE) readers & output hardware',
    branches: [
      {
        id: 't2-1',
        code: '2.1',
        title: 'Input devices and their uses',
        summary:
          'Select manual input devices and environmental sensors for entering text, pointing, imaging, audio, and physical measurements.',
        keyPoints: [
          'Keyboards (ergonomic, concept, numeric keypads) enter text/numbers; concept keyboards use programmable icons for fast POS use.',
          'Pointing devices include optical mice, touchpads, trackerballs (great for limited desk space or RSI), and joysticks.',
          'Scanners convert hard-copy documents/photos to digital images; digital cameras and webcams capture stills and live video.',
          'Analogue sensors (temperature, light, pressure, humidity, pH, sound) feed ADC converters for computer monitoring and control.'
        ],
        examTip:
          'State why a trackerball or concept keyboard fits a constrained or specialist environment (e.g., fast-food till or disability access).',
        keywords: ['Keyboard', 'Trackerball', 'Touchscreen', 'Scanner', 'Sensor', 'ADC']
      },
      {
        id: 't2-2',
        code: '2.2',
        title: 'Direct data entry and associated devices',
        summary:
          'Automate fast, accurate data capture without manual typing using magnetic stripes, chip/PIN, RFID, OMR, OCR, and barcode/QR readers.',
        keyPoints: [
          'Magnetic stripe readers read data on bank/hotel cards cheaply, though stripes demagnetise easily and hold little data.',
          'Chip and PIN (EMV) readers verify smartcard microchips securely with a 4-digit PIN.',
          'RFID uses radio waves to read tags at a distance without line-of-sight (livestock, passports, warehouse pallets, contactless pay).',
          'OMR reads shaded marks on MCQ/lottery forms; OCR converts printed text images into editable text; barcodes/QR codes store product/URL links.'
        ],
        examTip:
          'Distinguish OMR (position of pencil marks) from OCR (recognising character shapes into editable text) and RFID (no line-of-sight needed).',
        keywords: ['RFID', 'OMR', 'OCR', 'Barcode', 'QR code', 'Chip and PIN']
      },
      {
        id: 't2-3',
        code: '2.3',
        title: 'Output devices and their uses',
        summary:
          'Choose monitors, projectors, printers, plotters, speakers, and actuators based on print volume, precision, quality, and environment.',
        keyPoints: [
          'LCD/LED monitors offer slim, energy-efficient displays; touchscreens act as both input and output.',
          'Laser printers print fast, crisp pages at low cost per page using toner; inkjet printers excel at vivid photos at lower upfront cost.',
          'Dot matrix impact printers print multi-part carbon-copy stationery in dusty workshops; 3D printers build physical prototypes layer by layer.',
          'Plotters draw large high-precision architectural/CAD blueprints; actuators convert electrical signals into physical movement.'
        ],
        examTip:
          'Match the printer to the task: noisy dusty garage with multi-part invoices -> dot matrix; high-volume office text -> laser; large CAD drawing -> plotter.',
        keywords: ['Laser printer', 'Inkjet', 'Dot matrix', '3D printer', 'Plotter', 'Actuator']
      }
    ]
  },
  {
    id: 3,
    title: 'Storage devices and media',
    subtitle: 'Magnetic, optical and solid-state backing storage technologies',
    branches: [
      {
        id: 't3-1',
        code: '3.1',
        title: 'Magnetic storage media',
        summary:
          'Understand hard disk drives (HDDs) and magnetic tape for high-capacity servers, desktop archives, and batch backups.',
        keyPoints: [
          'HDDs store data on spinning magnetised platters read by moving read/write heads; very low cost per GB and large capacities.',
          'Moving parts make HDDs slower and more vulnerable to physical shock than solid-state drives.',
          'Magnetic tape provides sequential access at extremely low cost per TB, ideal for long-term off-site archival backups.',
          'Tape drives cannot jump directly to a single file quickly because access is serial/sequential.'
        ],
        examTip:
          'Explain serial/sequential access on magnetic tape versus direct/random access on HDDs and SSDs.',
        keywords: ['HDD', 'Magnetic tape', 'Sequential access', 'Platters', 'Archive']
      },
      {
        id: 't3-2',
        code: '3.2',
        title: 'Optical storage media',
        summary:
          'Compare CD, DVD, and Blu-ray discs across laser wavelength, track pitch, capacity, and read/write formats (-R, -RW, -ROM).',
        keyPoints: [
          'Optical discs use lasers to read microscopic pits and lands on a reflective surface.',
          'CDs hold ~700 MB (red/IR laser); DVDs hold ~4.7 GB single-layer (shorter-wavelength red laser); Blu-ray holds 25–50 GB (blue-violet laser).',
          'ROM discs are read-only for software/movies; R discs are write-once; RW discs can be erased and rewritten repeatedly.',
          'Optical media is portable and cheap per disc, though easily scratched and increasingly replaced by streaming/cloud.'
        ],
        examTip:
          'Link smaller laser wavelength (blue-violet vs red) to tighter pit spacing and higher capacity on Blu-ray discs.',
        keywords: ['CD', 'DVD', 'Blu-ray', 'Pits and lands', 'ROM', 'RW']
      },
      {
        id: 't3-3',
        code: '3.3',
        title: 'Solid-state storage media',
        summary:
          'Examine SSDs, USB flash drives, SD/microSD memory cards, and why flash memory dominates portable computing.',
        keyPoints: [
          'Solid-state storage uses NAND flash memory with floating-gate transistors and zero moving parts.',
          'SSDs deliver rapid boot times, silent operation, low power draw, and strong resistance to drops or vibration.',
          'USB flash drives and SD/microSD cards offer compact, hot-swappable storage for cameras, phones, and file transfer.',
          'Higher cost per GB than HDDs and a finite number of write/erase cycles over long-term heavy use.'
        ],
        examTip:
          'Contrast SSD and HDD directly: SSD = faster access, silent, shock-resistant, lighter, cooler, higher cost/GB.',
        keywords: ['SSD', 'Flash memory', 'SD card', 'USB drive', 'Non-volatile']
      }
    ]
  },
  {
    id: 4,
    title: 'Networks and the effects of using them',
    subtitle: 'Network hardware, LAN/WLAN/WAN, authentication & electronic conferencing',
    branches: [
      {
        id: 't4-1',
        code: '4.1',
        title: 'Networks & hardware devices',
        summary:
          'Explore how routers, switches, hubs, bridges, NICs, Wi-Fi, Bluetooth, and cloud storage connect devices across LANs, WLANs, and WANs.',
        keyPoints: [
          'Routers forward data packets between different networks (such as LAN to the Internet) using IP routing tables.',
          'Switches inspect MAC addresses to send frames only to the intended device; hubs broadcast packets to all ports, wasting bandwidth.',
          'Bridges connect two LAN segments using the same protocol; NICs give each device a unique hardware MAC address.',
          'Wi-Fi covers wider buildings at high speed; Bluetooth links short-range personal peripherals (PAN) with low power.'
        ],
        examTip:
          'Always highlight the difference between a hub (broadcasts to every port, less secure) and a switch (unicast via MAC address).',
        keywords: ['Router', 'Switch', 'Hub', 'Bridge', 'LAN', 'WAN', 'Bluetooth', 'Wi-Fi']
      },
      {
        id: 't4-2',
        code: '4.2',
        title: 'Network security & authentication',
        summary:
          'Protect networks and user accounts with zero-trust principles, strong passwords, 2FA, biometrics, magnetic/smart tokens, and encryption.',
        keyPoints: [
          'Authentication verifies identity using passwords, PINs, biometrics (fingerprint, iris, face, voice), or physical tokens/cards.',
          'Two-factor authentication (2FA) requires two distinct proof factors (e.g., password + SMS/authenticator code).',
          'Anti-malware and firewalls inspect incoming/outgoing network traffic and block unauthorised connections.',
          'Encryption scrambles data with a key so intercepted packets are unreadable without the decryption key.'
        ],
        examTip:
          'Explain why 2FA beats a long password alone: even if a password leaks, the attacker still lacks the second factor.',
        keywords: ['2FA', 'Biometrics', 'Firewall', 'Encryption', 'MAC address', 'Zero-day']
      },
      {
        id: 't4-3',
        code: '4.3',
        title: 'Electronic conferencing & collaboration',
        summary:
          'Compare audio, video, and web conferencing tools alongside their hardware requirements, productivity gains, and limitations.',
        keyPoints: [
          'Video conferencing needs webcams, microphones, speakers/headsets, stable broadband, and conferencing software.',
          'Benefits include zero travel costs/time, reduced carbon emissions, rapid cross-country meetings, and screen/document sharing.',
          'Drawbacks cover time-zone clashes, lack of physical rapport, dependency on reliable internet, and high hardware/bandwidth setup costs.',
          'Web conferencing adds live polls, whiteboards, breakout rooms, and file sharing for remote lessons or webinars.'
        ],
        examTip:
          'List specific hardware (webcam, microphone, speakers, high-speed connection) plus social and financial pros/cons.',
        keywords: ['Video conferencing', 'Web conferencing', 'Audio conferencing', 'Bandwidth']
      }
    ]
  },
  {
    id: 5,
    title: 'The effects of using IT',
    subtitle: 'Microprocessor-controlled home devices & IT workplace health issues',
    branches: [
      {
        id: 't5-1',
        code: '5.1',
        title: 'Microprocessor-controlled devices',
        summary:
          'Analyse how embedded microprocessors in appliances, smart thermostats, and autonomous devices change daily life, leisure, and security.',
        keyPoints: [
          'Household appliances (washing machines, smart fridges, microwave ovens, robotic vacuums) automate routine chores.',
          'Advantages: saves time for leisure, improves energy efficiency via timers/sensors, and supports elderly/disabled independence.',
          'Disadvantages: leads to deskilling, sedentary lifestyles, high repair/replacement costs, and smart-home privacy/hacking risks.',
          'Autonomous transport systems aim to reduce human error collisions while raising liability and job-transition questions.'
        ],
        examTip:
          'Frame answers in balanced pairs (lifestyle convenience vs over-reliance/deskilling; safety vs cyber-vulnerability).',
        keywords: ['Microprocessor', 'Embedded system', 'Smart home', 'Deskilling', 'Autonomous']
      },
      {
        id: 't5-2',
        code: '5.2',
        title: 'Health problems & prevention',
        summary:
          'Identify physical health hazards from prolonged IT equipment use and apply ergonomic strategies to prevent them.',
        keyPoints: [
          'Repetitive Strain Injury (RSI) damages wrists/fingers from excessive typing or mouse clicks; use ergonomic keyboards, wrist rests, and breaks.',
          'Back and neck pain stem from poor posture; prevent using adjustable ergonomic chairs, foot rests, and eye-level monitors.',
          'Eye strain and headaches come from screen glare or flicker; use anti-glare filters, soft lighting, and the 20-20-20 break rule.',
          'Deep Vein Thrombosis (DVT) and fatigue arise from sitting still too long; encourage regular movement and hydration.'
        ],
        examTip:
          'Always link each named health issue (e.g., RSI) to a concrete ergonomic prevention method (e.g., wrist rest + regular breaks).',
        keywords: ['RSI', 'Eye strain', 'Backache', 'Ergonomic', 'Anti-glare', 'Posture']
      }
    ]
  },
  {
    id: 6,
    title: 'ICT applications',
    subtitle: 'Real-world systems across banking, medicine, retail, travel, schools & satellites',
    branches: [
      {
        id: 't6-1',
        code: '6.1',
        title: 'Communication & modelling',
        summary:
          'Understand newsletters, websites, multimedia presentations, computer models (finance, weather, bridges, traffic), and simulations.',
        keyPoints: [
          'Computer models test "what-if" scenarios safely and cheaply without risking lives or wasting materials (e.g., flight simulators, flood prediction).',
          'Spreadsheets model budgets and profit projections by changing variables and recalculating formulas instantly.',
          'Models are only as accurate as the mathematical rules and historical data fed into them.',
          'Communication media (websites, flyers, posters, podcasts) match formatting, layout, and tone to audience needs.'
        ],
        examTip:
          'Give 3 classic reasons for modelling: cheaper than building prototypes, safer for dangerous tests, faster to test extreme timeframes.',
        keywords: ['Modelling', 'Simulation', 'What-if analysis', 'Multimedia', 'Prototype']
      },
      {
        id: 't6-2',
        code: '6.2',
        title: 'Control, schools, booking & banking',
        summary:
          'See how feedback control loops, MIS school systems, real-time booking engines, ATMs, and EFTPOS/online banking operate.',
        keyPoints: [
          'Control systems compare sensor readings against preset target values and trigger actuators in a continuous feedback loop (greenhouses, central heating).',
          'School MIS tracks attendance, timetables, assessment marks, and parent communication.',
          'Online booking systems lock seats/rooms immediately in a central database to prevent double-booking.',
          'ATMs, EFTPOS, and online banking verify cards/PINs and update account ledgers electronically.'
        ],
        examTip:
          'Explain how a central real-time database prevents double-booking by locking a seat as soon as a user selects it.',
        keywords: ['Feedback loop', 'MIS', 'Booking system', 'ATM', 'EFTPOS', 'Double-booking']
      },
      {
        id: 't6-3',
        code: '6.3',
        title: 'Medicine, expert systems & retail',
        summary:
          'Examine hospital patient monitoring, 3D prosthetics, expert system architecture, and automated retail stock control (POS).',
        keyPoints: [
          'Medical systems monitor vital signs 24/7 via sensors, manage EHR records, and 3D-print custom prosthetics or dental implants.',
          'Expert systems consist of a user interface, inference engine, knowledge base (facts), and rules base (IF-THEN logic).',
          'Retail POS terminals scan barcodes to look up prices in the stock database and automatically deduct stock quantities.',
          'When stock falls below the re-order level, the system triggers an automated purchase order to the supplier.'
        ],
        examTip:
          'Memorise the 4 components of an expert system: User Interface, Inference Engine, Knowledge Base, and Rules Base.',
        keywords: ['Expert system', 'Inference engine', 'Knowledge base', 'POS', 'Stock control']
      },
      {
        id: 't6-4',
        code: '6.4',
        title: 'Recognition & satellite systems',
        summary:
          'Review ANPR, biometrics, OMR/OCR/RFID recognition, plus GPS/GNSS sat-nav, GIS mapping, and satellite communication.',
        keyPoints: [
          'ANPR cameras capture vehicle number plates, apply OCR to read characters, and check barriers, tolls, or parking duration.',
          'Biometric recognition (fingerprint, iris, facial geometry) eliminates forgotten passwords and prevents buddy-punching.',
          'GPS/Sat-nav uses trilateration from at least 3–4 satellites to compute exact position, speed, and live route guidance.',
          'GIS layers spatial map coordinates with demographic, environmental, or utility data for urban planning.'
        ],
        examTip:
          'Remember how ANPR works step-by-step: sensor detects car -> camera photographs plate -> OCR extracts text -> database checks payment/status -> barrier opens.',
        keywords: ['ANPR', 'GPS', 'GIS', 'Trilateration', 'Biometrics', 'Sat-nav']
      }
    ]
  },
  {
    id: 7,
    title: 'The systems life cycle',
    subtitle: 'Analysis, design, development/testing, implementation, documentation & evaluation',
    branches: [
      {
        id: 't7-1',
        code: '7.1',
        title: 'Analysis & design',
        summary:
          'Gather client requirements using fact-finding methods, then design data structures, input forms, validation rules, and output layouts.',
        keyPoints: [
          'Fact-finding methods: Observation (sees reality, Hawthorne effect), Questionnaires (quick for many people, low detail), Interviews (deep detail, slow), Document inspection.',
          'Data Flow Diagrams (DFDs) map inputs, processes, data stores, and outputs of the current system.',
          'Design stage creates file/table structures, field types, primary keys, validation checks, screen forms, and printed report layouts.',
          'Validation checks (range, type, length, format, presence, check digit) ensure reasonable data; verification checks accurate transcription (double entry, visual check).'
        ],
        examTip:
          'Never confuse validation (computer checks data is sensible/follows rules) with verification (checks copied data matches the original source).',
        keywords: ['Observation', 'Questionnaire', 'Interview', 'Validation', 'Verification', 'DFD']
      },
      {
        id: 't7-2',
        code: '7.2',
        title: 'Development & testing',
        summary:
          'Build system modules and rigorously verify behaviour using normal, abnormal, extreme, and live test data.',
        keyPoints: [
          'Developers create databases, interfaces, and program modules according to the design specification.',
          'Normal data tests valid everyday inputs within expected boundaries (e.g., 25 for age 1–100).',
          'Abnormal/erroneous data tests invalid types or out-of-range inputs that must be rejected (e.g., -5 or "abc").',
          'Extreme data tests exact boundary edges (e.g., 1 and 100); live testing uses real operational data.'
        ],
        examTip:
          'When asked for test data on a 1–50 range, quote Normal (e.g., 25), Extreme (1 and 50), and Abnormal (0, 51, or "ten").',
        keywords: ['Normal data', 'Abnormal data', 'Extreme data', 'Live data', 'Test plan']
      },
      {
        id: 't7-3',
        code: '7.3',
        title: 'Implementation & documentation',
        summary:
          'Switch from old to new systems safely and supply separate technical and user manuals.',
        keyPoints: [
          'Direct changeover stops the old system and starts the new one overnight (fast/cheap, high risk).',
          'Parallel running runs old and new simultaneously (safest backup, double workload/cost).',
          'Pilot running tests the new system in one branch first; Phased implementation rolls out module by module.',
          'Technical documentation helps programmers maintain the system (flowcharts, code, hardware specs); User documentation helps staff operate it (tutorials, FAQs).'
        ],
        examTip:
          'Always specify one clear advantage and one drawback for each changeover method (e.g., Parallel = safe fallback vs expensive duplicate entry).',
        keywords: ['Direct changeover', 'Parallel running', 'Pilot', 'Phased', 'Technical docs', 'User guide']
      },
      {
        id: 't7-4',
        code: '7.4',
        title: 'Evaluation',
        summary:
          'Assess the finished system against original requirements, user feedback, efficiency, and ease of use.',
        keyPoints: [
          'Compare final system features directly against the requirements specification created during Analysis.',
          'Evaluate efficiency, processing speed, error rates, and staff satisfaction through interviews and surveys.',
          'Identify limitations or unexpected bugs and log future maintenance or upgrade recommendations.',
          'Determine whether time/cost targets were met and how well users adapted.'
        ],
        examTip:
          'Evaluation always loops back to the original requirements specification from Stage 1 (Analysis).',
        keywords: ['Requirements', 'User feedback', 'Efficiency', 'Maintenance', 'Limitations']
      }
    ]
  },
  {
    id: 8,
    title: 'Safety and security',
    subtitle: 'Physical electrical safety, eSafety online behaviour & cyber/data protection',
    branches: [
      {
        id: 't8-1',
        code: '8.1',
        title: 'Physical safety',
        summary:
          'Eliminate physical workplace hazards including electrocution, trailing cables, overloaded sockets, and equipment fire risks.',
        keyPoints: [
          'Prevent electrocution by keeping drinks away from hardware and using Residual Current Circuit Breakers (RCCBs).',
          'Avoid fire hazards by never overloading multi-plug sockets and keeping cooling vents clear of paper.',
          'Eliminate trip hazards by securing cables in trunking/floor covers or using wireless devices.',
          'Place heavy monitors/printers centrally on sturdy desks so equipment cannot topple onto users.'
        ],
        examTip:
          'Do not mix up Physical Safety (injury/electrocution/fire) with Data Security (hacking/malware/encryption)!',
        keywords: ['Electrocution', 'Trailing cables', 'Overloaded socket', 'CO2 extinguisher', 'Trunking']
      },
      {
        id: 't8-2',
        code: '8.2',
        title: 'eSafety',
        summary:
          'Protect personal identity, privacy, and wellbeing when interacting on social media, messaging apps, and online games.',
        keyPoints: [
          'Never share personal data (home address, school uniform photos, phone number, live location) publicly online.',
          'Use strict privacy settings, block/report cyberbullying or suspicious strangers, and keep screenshots as evidence.',
          'Verify online contacts and never meet strangers from the internet alone without trusted adults.',
          'Use secure HTTPS sites and strong unique passwords when shopping or gaming online.'
        ],
        examTip:
          'Give practical student actions for eSafety: set profiles to private, avoid posting identifiable school logos, block and report.',
        keywords: ['Personal data', 'Privacy settings', 'Cyberbullying', 'Digital footprint', 'Stranger danger']
      },
      {
        id: 't8-3',
        code: '8.3',
        title: 'Security of data & cyber threats',
        summary:
          'Defend against phishing, smishing, vishing, pharming, malware, and hacking using firewalls, SSL/TLS, biometrics, and backups.',
        keyPoints: [
          'Phishing uses fake emails; Smishing uses SMS; Vishing uses voice calls; Pharming redirects DNS/hosts traffic to bogus websites.',
          'Malware includes viruses, worms, Trojan horses, spyware/keyloggers, adware, and ransomware.',
          'Digital certificates and SSL/TLS (HTTPS padlock) verify website authenticity and encrypt browser-to-server traffic.',
          'Cloud/off-site encrypted backups protect against hardware failure, theft, and ransomware.'
        ],
        examTip:
          'Clearly distinguish Phishing (deceptive email link) from Pharming (malicious DNS/code redirect even if the user types the right URL).',
        keywords: ['Phishing', 'Pharming', 'Smishing', 'Ransomware', 'SSL/TLS', 'Digital certificate']
      }
    ]
  },
  {
    id: 9,
    title: 'Audience',
    subtitle: 'Audience analysis, inclusive design, legal compliance & copyright protection',
    branches: [
      {
        id: 't9-1',
        code: '9.1',
        title: 'Audience appreciation',
        summary:
          'Tailor content, tone, typography, colour contrast, and interactivity to target age, ICT experience, and accessibility needs.',
        keyPoints: [
          'Analyse audience age, language fluency, cultural background, and ICT literacy before designing ICT solutions.',
          'Young children need bright colours, large clickable targets, animations, audio narration, and minimal dense text.',
          'Corporate or senior audiences prefer clean layouts, high contrast, readable sans-serif fonts, and direct navigation.',
          'Accessibility features include screen-reader alt text, captions/subtitles, adjustable text size, and colour-blind-safe palettes.'
        ],
        examTip:
          'Always justify design choices (font size, vocabulary, colour, audio) directly from the target audience profile.',
        keywords: ['Target audience', 'Accessibility', 'Contrast', 'Readability', 'Alt text']
      },
      {
        id: 't9-2',
        code: '9.2',
        title: 'Copyright & intellectual property',
        summary:
          'Respect copyright law for software, images, audio, and text while using legal licensing and software anti-piracy mechanisms.',
        keyPoints: [
          'Copyright automatically protects original creative works (software, music, photos, text, video) from unauthorised copying or distribution.',
          'Always obtain permission, purchase a commercial licence, or use Creative Commons / royalty-free assets with proper attribution.',
          'Software copyright protections include product activation keys, licence agreements (EULA), digital watermarks, and hardware dongles.',
          'Plagiarism means presenting someone else’s work as your own without citation.'
        ],
        examTip:
          'Know 3 technical ways companies deter software piracy: unique product keys, online activation, dongles, or EULA limits.',
        keywords: ['Copyright', 'Creative Commons', 'Product key', 'Dongle', 'Plagiarism', 'EULA']
      }
    ]
  },
  {
    id: 10,
    title: 'Communication',
    subtitle: 'Email etiquette, mailing lists, netiquette & effective internet searching',
    branches: [
      {
        id: 't10-1',
        code: '10.1',
        title: 'Email communication & constraints',
        summary:
          'Use To, CC, BCC, attachments, spam filters, netiquette, and data protection rules responsibly.',
        keyPoints: [
          'CC sends visible copies to secondary recipients; BCC hides recipient email addresses to protect privacy in group mailouts.',
          'Email constraints include attachment file-size caps, spam/phishing risks, copyright on forwarded files, and national data protection laws.',
          'Netiquette requires clear subject lines, polite language, no ALL CAPS shouting, and proofreading before sending.',
          'Forward/Reply All should be used carefully so sensitive or irrelevant messages are not broadcast widely.'
        ],
        examTip:
          'BCC is essential when emailing parents or customers in bulk so everyone’s personal email address stays hidden.',
        keywords: ['CC', 'BCC', 'Netiquette', 'Spam filter', 'Attachment limit', 'Data protection']
      },
      {
        id: 't10-2',
        code: '10.2',
        title: 'Effective use of the internet',
        summary:
          'Differentiate the Internet from the WWW, navigate via URLs/hyperlinks/ISPs, and evaluate web information credibility.',
        keyPoints: [
          'The Internet is the global physical network of interconnected computers; the World Wide Web (WWW) is the collection of hypertext pages accessed via HTTP/HTTPS.',
          'URLs specify protocol (https://), domain name, and file path; search engines index pages to match keywords and Boolean queries (AND, OR, NOT, quotes).',
          'Intranets are private internal organisational networks; Extranets extend limited intranet access to approved external partners/suppliers.',
          'Evaluate website reliability by checking author credentials, domain (.edu/.gov/.ac), publication date, bias, and cross-referencing sources.'
        ],
        examTip:
          'Clearly state the difference: Internet = global network infrastructure; WWW = web pages/sites hosted on that infrastructure.',
        keywords: ['Internet', 'WWW', 'URL', 'HTTP/HTTPS', 'Intranet', 'Extranet', 'Boolean search']
      }
    ]
  },
  {
    id: 11,
    title: 'File management',
    subtitle: 'Hierarchical folders, naming conventions, file formats & lossless/lossy compression',
    branches: [
      {
        id: 't11-1',
        code: '11.1',
        title: 'Manage files effectively',
        summary:
          'Organise hierarchical directories, apply meaningful file naming and version control, and pick generic vs proprietary file formats.',
        keyPoints: [
          'Store related files in logical nested folder hierarchies with clear names and version numbers (e.g., Report_v2_2029.pdf).',
          'Generic formats (.csv, .txt, .rtf, .pdf, .jpg, .mp4) open across different software platforms and operating systems.',
          'Proprietary formats (.docx, .xlsx, .psd) preserve app-specific features but may require the original software.',
          'Follow regular 3-2-1 backup routines so accidental deletion or corruption never causes permanent data loss.'
        ],
        examTip:
          'Use .csv or .txt when asked how to move tabular data between two incompatible spreadsheet/database programs.',
        keywords: ['Folder hierarchy', 'Version control', 'Generic format', '.csv', '.pdf', 'Backup']
      },
      {
        id: 't11-2',
        code: '11.2',
        title: 'Reduce file sizes & compression',
        summary:
          'Shrink storage footprint and speed up email/web transmission using lossless archiving, lossy media compression, and image resizing.',
        keyPoints: [
          'Compressing files lowers storage space needed, bypasses email attachment size limits, and speeds up uploads/downloads.',
          'Lossless compression (ZIP, PNG, FLAC) shrinks files without discarding any original data so exact files can be restored.',
          'Lossy compression (JPEG, MP3, MP4) achieves much smaller sizes by permanently removing imperceptible colour or audio detail.',
          'Resizing image dimensions (pixels) and lowering resolution (DPI) or colour depth reduces image file size before web publishing.'
        ],
        examTip:
          'Use lossless (.zip / .png) for program code, text documents, and spreadsheets; lossy (.jpg / .mp3) for web photos and streaming audio.',
        keywords: ['Lossless', 'Lossy', 'ZIP', 'JPEG', 'PNG', 'Resolution', 'Transmission']
      }
    ]
  }
];
