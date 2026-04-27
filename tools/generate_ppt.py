import copy
import io
import math
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont


WORKSPACE = Path(r"c:\Users\athar\OneDrive\Documents\Desktop\smart-volunteer-system")
TEMPLATE = Path(r"c:\Users\athar\Downloads\[EXT] Solution Challenge 2026 - Prototype PPT Template.pptx")
OUTPUT = WORKSPACE / "SevaLink_Solution_Challenge_Prototype.pptx"
ASSETS = WORKSPACE / "client" / "src" / "assets"
GENERATED = WORKSPACE / "generated_ppt_assets"

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

NS = {"p": P_NS, "a": A_NS, "r": R_NS}
ET.register_namespace("a", A_NS)
ET.register_namespace("p", P_NS)
ET.register_namespace("r", R_NS)

EMU_PER_INCH = 914400


def qn(namespace, tag):
    return f"{{{namespace}}}{tag}"


def ensure_dir(path):
    path.mkdir(parents=True, exist_ok=True)


def get_font(size, bold=False):
    candidates = [
        "arialbd.ttf" if bold else "arial.ttf",
        "segoeuib.ttf" if bold else "segoeui.ttf",
    ]
    for candidate in candidates:
        font_path = Path(r"C:\Windows\Fonts") / candidate
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default()


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def paragraph_height(font, spacing=8):
    bbox = font.getbbox("Ag")
    return (bbox[3] - bbox[1]) + spacing


def load_image(path, size=None):
    image = Image.open(path).convert("RGB")
    if size:
        image.thumbnail(size, Image.LANCZOS)
    return image


def draw_round_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def fit_cover(image, target_size):
    src_w, src_h = image.size
    tgt_w, tgt_h = target_size
    scale = max(tgt_w / src_w, tgt_h / src_h)
    resized = image.resize((int(src_w * scale), int(src_h * scale)), Image.LANCZOS)
    left = (resized.width - tgt_w) // 2
    top = (resized.height - tgt_h) // 2
    return resized.crop((left, top, left + tgt_w, top + tgt_h))


def create_process_flow(path):
    img = Image.new("RGB", (1600, 900), "#F7F9FC")
    draw = ImageDraw.Draw(img)
    title_font = get_font(46, bold=True)
    label_font = get_font(24, bold=True)
    body_font = get_font(21)

    draw.text((70, 40), "SevaLink Volunteer Response Flow", fill="#112A46", font=title_font)
    draw.text(
        (70, 100),
        "From issue reporting to verified completion with AI-assisted triage and NGO oversight",
        fill="#4A6078",
        font=get_font(24),
    )

    steps = [
        ("1. Report Issue", "NGO submits title, location, map pin, severity, image, and required skills."),
        ("2. Smart Triage", "Backend derives category, urgency score, escalation reason, and visibility settings."),
        ("3. Match Volunteers", "Matching service ranks volunteers using skills, availability, and performance."),
        ("4. Notify & Review", "Nearby volunteers and NGO admins receive alerts and candidate suggestions."),
        ("5. Confirm Assignment", "NGO manually assigns the best volunteer; volunteer confirms the task."),
        ("6. Complete & Verify", "Volunteer requests completion, NGO verifies, points and badges are updated."),
    ]

    box_w = 430
    box_h = 180
    start_x = 90
    start_y = 180
    gap_x = 70
    gap_y = 80
    colors = ["#D9F2FF", "#E7F9E7", "#FFF1D8", "#F2E8FF", "#FFE3EA", "#E2F1FF"]

    positions = []
    for idx in range(3):
        positions.append((start_x + idx * (box_w + gap_x), start_y))
    for idx in range(3):
        positions.append((start_x + idx * (box_w + gap_x), start_y + box_h + gap_y))

    for idx, ((heading, desc), (x, y)) in enumerate(zip(steps, positions)):
        draw_round_rect(draw, (x, y, x + box_w, y + box_h), 28, fill=colors[idx], outline="#B7C7DA", width=3)
        draw.text((x + 28, y + 22), heading, fill="#12314F", font=label_font)
        lines = wrap_text(draw, desc, body_font, box_w - 56)
        current_y = y + 70
        for line in lines[:4]:
            draw.text((x + 28, current_y), line, fill="#304A63", font=body_font)
            current_y += paragraph_height(body_font, 6)

    arrow_color = "#4A8DE8"
    arrow_w = 8
    for idx in range(2):
        x1 = positions[idx][0] + box_w
        y1 = positions[idx][1] + box_h // 2
        x2 = positions[idx + 1][0]
        y2 = positions[idx + 1][1] + box_h // 2
        draw.line((x1 + 10, y1, x2 - 20, y2), fill=arrow_color, width=arrow_w)
        draw.polygon([(x2 - 26, y2 - 12), (x2 - 6, y2), (x2 - 26, y2 + 12)], fill=arrow_color)

    for idx in range(3, 5):
        x1 = positions[idx][0] + box_w
        y1 = positions[idx][1] + box_h // 2
        x2 = positions[idx + 1][0]
        y2 = positions[idx + 1][1] + box_h // 2
        draw.line((x1 + 10, y1, x2 - 20, y2), fill=arrow_color, width=arrow_w)
        draw.polygon([(x2 - 26, y2 - 12), (x2 - 6, y2), (x2 - 26, y2 + 12)], fill=arrow_color)

    mid_x = positions[2][0] + box_w // 2
    top_y = positions[2][1] + box_h
    bottom_y = positions[5][1]
    draw.line((mid_x, top_y + 10, mid_x, bottom_y - 20), fill=arrow_color, width=arrow_w)
    draw.polygon([(mid_x - 12, bottom_y - 26), (mid_x, bottom_y - 6), (mid_x + 12, bottom_y - 26)], fill=arrow_color)

    img.save(path)


def create_wireframe(path):
    img = Image.new("RGB", (1600, 900), "#F8FAFD")
    draw = ImageDraw.Draw(img)
    draw.text((70, 38), "Key Product Surfaces", fill="#112A46", font=get_font(46, bold=True))
    draw.text((70, 96), "Homepage, task workspace, and NGO command dashboard", fill="#4A6078", font=get_font(24))

    frame_boxes = [
        (70, 150, 510, 810, "Landing Page", ASSETS / "hero.png"),
        (580, 150, 1020, 810, "Task Workspace", ASSETS / "intro.png"),
        (1090, 150, 1530, 810, "Admin Dashboard", ASSETS / "admin-bg.png"),
    ]

    for x1, y1, x2, y2, label, asset in frame_boxes:
        draw_round_rect(draw, (x1, y1, x2, y2), 28, fill="#FFFFFF", outline="#C9D6E3", width=4)
        panel = Image.new("RGB", (x2 - x1 - 36, y2 - y1 - 90), "#EDEFF5")
        if asset.exists():
            source = load_image(asset)
            panel = fit_cover(source, panel.size)
        img.paste(panel, (x1 + 18, y1 + 58))
        draw_round_rect(draw, (x1 + 18, y1 + 18, x2 - 18, y1 + 48), 14, fill="#EEF4FA")
        draw.text((x1 + 36, y1 + 19), label, fill="#173451", font=get_font(24, bold=True))
        draw.text((x1 + 36, y2 - 28), "Core user view", fill="#4E647A", font=get_font(18))

    callouts = [
        ((70, 828), "Animated homepage with impact story and team section"),
        ((580, 828), "Voice-enabled task intake, map pinning, offline queue, filters"),
        ((1090, 828), "Predictions, heatmap, volunteer leaderboard, manual assignment"),
    ]
    for (x, y), text in callouts:
        draw.text((x, y), text, fill="#334E68", font=get_font(20))

    img.save(path)


def create_architecture(path):
    img = Image.new("RGB", (1600, 900), "#F7F9FC")
    draw = ImageDraw.Draw(img)
    draw.text((70, 40), "SevaLink System Architecture", fill="#112A46", font=get_font(46, bold=True))
    draw.text((70, 100), "React client, Express APIs, MongoDB storage, Gemini assistant, and notification services", fill="#4A6078", font=get_font(24))

    sections = [
        ("Users", (90, 200, 330, 690), "#DDF4FF", ["Volunteers", "NGO Admins", "Community teams"]),
        ("Frontend", (390, 170, 760, 720), "#E9F9E8", ["React 19 SPA", "Router + Framer Motion", "Leaflet maps", "Speech input", "Offline cache"]),
        ("Backend", (820, 170, 1185, 720), "#FFF0DA", ["Express API", "Auth + JWT", "Task lifecycle", "Matching service", "Analytics service"]),
        ("Data & AI", (1245, 170, 1510, 720), "#F3E9FF", ["MongoDB", "Task / User / Notification models", "Google Gemini chat assistant", "Email notifications"]),
    ]

    for title, box, fill, bullets in sections:
        draw_round_rect(draw, box, 30, fill=fill, outline="#B6C7D8", width=3)
        draw.text((box[0] + 24, box[1] + 20), title, fill="#163654", font=get_font(30, bold=True))
        y = box[1] + 74
        for bullet in bullets:
            draw.ellipse((box[0] + 26, y + 10, box[0] + 38, y + 22), fill="#3264A8")
            for line in wrap_text(draw, bullet, get_font(22), box[2] - box[0] - 70):
                draw.text((box[0] + 52, y), line, fill="#36516B", font=get_font(22))
                y += paragraph_height(get_font(22), 6)
            y += 10

    connections = [
        ((330, 445), (390, 445)),
        ((760, 445), (820, 445)),
        ((1185, 445), (1245, 445)),
    ]
    for (x1, y1), (x2, y2) in connections:
        draw.line((x1 + 10, y1, x2 - 18, y2), fill="#4A8DE8", width=8)
        draw.polygon([(x2 - 24, y2 - 12), (x2 - 6, y2), (x2 - 24, y2 + 12)], fill="#4A8DE8")

    footer = "Hosting-ready split: client deploys separately from API server; MongoDB Atlas stores operational data."
    draw_round_rect(draw, (240, 770, 1360, 845), 18, fill="#FFFFFF", outline="#C9D6E3", width=2)
    draw.text((270, 792), footer, fill="#334E68", font=get_font(24))
    img.save(path)


def create_snapshots(path):
    img = Image.new("RGB", (1600, 900), "#F8FAFD")
    draw = ImageDraw.Draw(img)
    draw.text((70, 38), "Prototype Snapshot Highlights", fill="#112A46", font=get_font(46, bold=True))
    draw.text((70, 96), "Representative UI surfaces from the current SevaLink MVP", fill="#4A6078", font=get_font(24))

    cards = [
        ("Homepage & branding", ASSETS / "hero.png", (70, 150, 770, 430)),
        ("Community impact storytelling", ASSETS / "21.png", (830, 150, 1530, 430)),
        ("Admin control surface", ASSETS / "admin-bg.png", (70, 490, 770, 830)),
        ("Intro / onboarding visual", ASSETS / "intro.png", (830, 490, 1530, 830)),
    ]

    for label, asset, box in cards:
        draw_round_rect(draw, box, 26, fill="#FFFFFF", outline="#CAD7E5", width=3)
        inner = (box[0] + 18, box[1] + 56, box[2] - 18, box[3] - 18)
        panel = Image.new("RGB", (inner[2] - inner[0], inner[3] - inner[1]), "#E7EBF2")
        if asset.exists():
            panel = fit_cover(load_image(asset), panel.size)
        img.paste(panel, (inner[0], inner[1]))
        draw.text((box[0] + 24, box[1] + 16), label, fill="#173451", font=get_font(24, bold=True))

    img.save(path)


def clone_paragraph(paragraph):
    return copy.deepcopy(paragraph)


def set_text_shape(shape, paragraphs):
    tx_body = shape.find("p:txBody", NS)
    if tx_body is None:
        return

    lst_style = tx_body.find("a:lstStyle", NS)
    existing = tx_body.findall("a:p", NS)
    if not existing:
        return

    template_by_level = {}
    for paragraph in existing:
        level = paragraph.find("a:pPr", NS)
        lvl = level.get("lvl", "0") if level is not None else "0"
        template_by_level.setdefault(lvl, paragraph)

    for paragraph in list(tx_body.findall("a:p", NS)):
        tx_body.remove(paragraph)

    for text, lvl in paragraphs:
        template = template_by_level.get(str(lvl)) or existing[min(lvl, len(existing) - 1)] or existing[0]
        new_p = clone_paragraph(template)
        for child in list(new_p):
            if child.tag == qn(A_NS, "r"):
                new_p.remove(child)
        runs = new_p.findall("a:r", NS)
        if runs:
            for run in runs:
                t = run.find("a:t", NS)
                if t is not None:
                    t.text = ""
        else:
            run = ET.SubElement(new_p, qn(A_NS, "r"))
            ET.SubElement(run, qn(A_NS, "t"))
        p_pr = new_p.find("a:pPr", NS)
        if p_pr is not None:
            p_pr.set("lvl", str(lvl))
        first_t = new_p.find(".//a:t", NS)
        if first_t is not None:
            first_t.text = text
        tx_body.append(new_p)


def add_picture_shape(slide_root, rel_id, shape_id, name, x, y, cx, cy):
    sp_tree = slide_root.find(".//p:spTree", NS)
    pic = ET.SubElement(sp_tree, qn(P_NS, "pic"))

    nv_pic_pr = ET.SubElement(pic, qn(P_NS, "nvPicPr"))
    ET.SubElement(nv_pic_pr, qn(P_NS, "cNvPr"), {"id": str(shape_id), "name": name})
    ET.SubElement(nv_pic_pr, qn(P_NS, "cNvPicPr"), {"preferRelativeResize": "0"})
    ET.SubElement(nv_pic_pr, qn(P_NS, "nvPr"))

    blip_fill = ET.SubElement(pic, qn(P_NS, "blipFill"))
    ET.SubElement(blip_fill, qn(A_NS, "blip"), {qn(R_NS, "embed"): rel_id})
    stretch = ET.SubElement(blip_fill, qn(A_NS, "stretch"))
    ET.SubElement(stretch, qn(A_NS, "fillRect"))

    sp_pr = ET.SubElement(pic, qn(P_NS, "spPr"))
    xfrm = ET.SubElement(sp_pr, qn(A_NS, "xfrm"))
    ET.SubElement(xfrm, qn(A_NS, "off"), {"x": str(x), "y": str(y)})
    ET.SubElement(xfrm, qn(A_NS, "ext"), {"cx": str(cx), "cy": str(cy)})
    prst = ET.SubElement(sp_pr, qn(A_NS, "prstGeom"), {"prst": "rect"})
    ET.SubElement(prst, qn(A_NS, "avLst"))
    ET.SubElement(sp_pr, qn(A_NS, "noFill"))
    ln = ET.SubElement(sp_pr, qn(A_NS, "ln"))
    ET.SubElement(ln, qn(A_NS, "noFill"))


def add_text_box(slide_root, shape_id, name, x, y, cx, cy, lines):
    sp_tree = slide_root.find(".//p:spTree", NS)
    sp = ET.SubElement(sp_tree, qn(P_NS, "sp"))
    nv_sp_pr = ET.SubElement(sp, qn(P_NS, "nvSpPr"))
    ET.SubElement(nv_sp_pr, qn(P_NS, "cNvPr"), {"id": str(shape_id), "name": name})
    ET.SubElement(nv_sp_pr, qn(P_NS, "cNvSpPr"), {"txBox": "1"})
    ET.SubElement(nv_sp_pr, qn(P_NS, "nvPr"))

    sp_pr = ET.SubElement(sp, qn(P_NS, "spPr"))
    xfrm = ET.SubElement(sp_pr, qn(A_NS, "xfrm"))
    ET.SubElement(xfrm, qn(A_NS, "off"), {"x": str(x), "y": str(y)})
    ET.SubElement(xfrm, qn(A_NS, "ext"), {"cx": str(cx), "cy": str(cy)})
    prst = ET.SubElement(sp_pr, qn(A_NS, "prstGeom"), {"prst": "rect"})
    ET.SubElement(prst, qn(A_NS, "avLst"))
    ET.SubElement(sp_pr, qn(A_NS, "noFill"))
    ln = ET.SubElement(sp_pr, qn(A_NS, "ln"))
    ET.SubElement(ln, qn(A_NS, "noFill"))

    tx_body = ET.SubElement(sp, qn(P_NS, "txBody"))
    ET.SubElement(
        tx_body,
        qn(A_NS, "bodyPr"),
        {
            "anchor": "t",
            "lIns": "91425",
            "tIns": "91425",
            "rIns": "91425",
            "bIns": "91425",
            "wrap": "square",
        },
    )
    ET.SubElement(tx_body, qn(A_NS, "lstStyle"))

    for text, size, bold, color in lines:
        p = ET.SubElement(tx_body, qn(A_NS, "p"))
        p_pr = ET.SubElement(p, qn(A_NS, "pPr"), {"algn": "l", "marL": "0", "indent": "0"})
        ET.SubElement(p_pr, qn(A_NS, "buNone"))
        r = ET.SubElement(p, qn(A_NS, "r"))
        r_pr = ET.SubElement(
            r,
            qn(A_NS, "rPr"),
            {
                "lang": "en-US",
                "sz": str(size * 100),
                "b": "1" if bold else "0",
            },
        )
        solid = ET.SubElement(r_pr, qn(A_NS, "solidFill"))
        ET.SubElement(solid, qn(A_NS, "srgbClr"), {"val": color})
        ET.SubElement(r_pr, qn(A_NS, "latin"), {"typeface": "Google Sans"})
        t = ET.SubElement(r, qn(A_NS, "t"))
        t.text = text


def update_slide_texts(zip_in, zip_out):
    text_updates = {
        2: [
            ("Team Details", 0),
            ("", 0),
            ("Team name: SevaLink", 0),
            ("Team leader name: Atharva Holsambre", 0),
            (
                "Problem Statement: NGOs and volunteers often struggle to coordinate urgent community needs quickly, clearly, and fairly across locations.",
                0,
            ),
        ],
        3: [
            ("Brief about your solution", 0),
            ("", 0),
            (
                "SevaLink is a smart volunteer coordination platform that helps NGOs capture community issues, identify urgency, and route tasks to the right volunteers.",
                0,
            ),
            (
                "The system combines task intake, live dashboards, map-based visibility, smart volunteer matching, prediction analytics, and a Gemini-powered assistant in one workflow.",
                0,
            ),
            (
                "It is designed for disaster relief, food support, medical outreach, education drives, and neighborhood development programs where fast action matters.",
                0,
            ),
        ],
        4: [
            ("Opportunities", 0),
            ("How different is it from any of the other existing ideas?", 0),
            (
                "SevaLink combines task creation, skill-based volunteer matching, heatmaps, predictive analytics, offline-safe reporting, and NGO verification in one product instead of splitting them across separate tools.",
                0,
            ),
            ("How will it be able to solve the problem?", 0),
            (
                "It reduces response delay by structuring requests, tagging urgency automatically, surfacing the best-fit volunteers, and keeping every assignment visible until completion.",
                0,
            ),
            ("USP of the proposed solution", 0),
            (
                "Gemini-powered guidance, smart matching using skills plus availability plus performance, geolocation-enabled task routing, and a complete volunteer-to-admin task lifecycle.",
                0,
            ),
        ],
        5: [
            ("List of features offered by the solution", 0),
            ("", 0),
            ("Volunteer and NGO authentication with role-based access", 0),
            ("Voice-enabled task reporting for NGO users", 0),
            ("Map pinning and Google Maps link generation for exact task location", 0),
            ("AI-derived urgency, category, and escalation signals during task creation", 0),
            ("Skill-based volunteer matching with availability and rating signals", 0),
            ("Volunteer dashboard with open, assigned, and completed task stages", 0),
            ("NGO admin dashboard with predictions, heatmap, leaderboard, and notifications", 0),
            ("Offline task queue and cached task views for unstable connectivity", 0),
            ("Gemini chatbot for platform guidance and volunteer support suggestions", 0),
        ],
        9: [
            ("Technologies to be used in the solution", 0),
            ("", 0),
            ("Frontend: React 19, React Router, Framer Motion, React Leaflet, Chart.js", 0),
            ("Backend: Node.js, Express, Multer, Nodemailer", 0),
            ("Database: MongoDB / MongoDB Atlas", 0),
            ("AI / Cloud service: Google Gemini via @google/generative-ai", 0),
            ("Utilities: Browser SpeechRecognition, localStorage caching, JWT-based auth", 0),
            ("Deployment plan: React client + Node/Express API + MongoDB Atlas cloud database", 0),
        ],
        10: [
            ("Estimated implementation cost (optional)", 0),
            ("", 0),
            ("Development cost: Student prototype, built in-house by the team", 0),
            ("Hosting: Vercel / Netlify for frontend and Render / Railway for backend", 0),
            ("Database: MongoDB Atlas free or starter tier depending on traffic", 0),
            ("AI usage: Gemini API usage cost depends on prompt volume and chosen model tier", 0),
            ("Email alerts: Low-cost SMTP / Gmail app password based notifications for prototype", 0),
            ("Estimated prototype operating cost: low to moderate for early-stage pilot deployment", 0),
        ],
        12: [
            ("Additional Details/Future Development (if any)", 0),
            ("", 0),
            ("Add multilingual support for local communities and field volunteers", 0),
            ("Integrate disaster-specific playbooks and suggested response checklists", 0),
            ("Use stronger predictive models for resource forecasting by region and category", 0),
            ("Add public beneficiary request forms and NGO-to-NGO collaboration workflows", 0),
            ("Launch full cloud deployment with real-time notifications and mobile-friendly PWA packaging", 0),
        ],
        13: [
            ("Provide links to your:", 0),
            ("", 0),
            ("1. GitHub Public Repository: https://github.com/Atharvax25/smart-volunteer-system", 0),
            ("2. Demo Video Link (3 Minutes): To be added by team", 0),
            ("3. MVP Link: To be added after public deployment", 0),
            ("4. Working Prototype Link: Local prototype available from the project repository", 0),
        ],
    }

    for slide_no, paragraphs in text_updates.items():
        slide_path = f"ppt/slides/slide{slide_no}.xml"
        root = ET.fromstring(zip_in.read(slide_path))
        shapes = root.findall(".//p:sp", NS)
        target_shape = shapes[0]
        if slide_no == 2:
            target_shape = shapes[1]
        set_text_shape(target_shape, paragraphs)
        zip_out.writestr(slide_path, ET.tostring(root, encoding="utf-8", xml_declaration=True))


def add_slide_images(zip_in, zip_out, media_map):
    slides_with_images = {
        6: ("process_flow.png", 0.55, 1.55, 8.9, 3.65),
        7: ("wireframe.png", 0.55, 1.55, 8.9, 3.65),
        8: ("architecture.png", 0.55, 1.55, 8.9, 3.65),
        11: ("snapshots.png", 0.55, 1.55, 8.9, 3.65),
    }

    for slide_no, (media_name, x, y, w, h) in slides_with_images.items():
        slide_path = f"ppt/slides/slide{slide_no}.xml"
        rel_path = f"ppt/slides/_rels/slide{slide_no}.xml.rels"
        root = ET.fromstring(zip_in.read(slide_path))
        rel_root = ET.fromstring(zip_in.read(rel_path))

        existing_ids = []
        for node in root.findall(".//*[@id]"):
            try:
                existing_ids.append(int(node.attrib["id"]))
            except ValueError:
                pass
        next_shape_id = max(existing_ids or [200]) + 1
        next_rel_num = 1
        existing_rel_ids = {rel.attrib["Id"] for rel in rel_root.findall(f'{{{PKG_REL_NS}}}Relationship')}
        while f"rId{next_rel_num}" in existing_rel_ids:
            next_rel_num += 1
        rel_id = f"rId{next_rel_num}"

        ET.SubElement(
            rel_root,
            qn(PKG_REL_NS, "Relationship"),
            {
                "Id": rel_id,
                "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
                "Target": f"../media/{media_name}",
            },
        )
        add_picture_shape(
            root,
            rel_id,
            next_shape_id,
            f"Generated Image {slide_no}",
            int(x * EMU_PER_INCH),
            int(y * EMU_PER_INCH),
            int(w * EMU_PER_INCH),
            int(h * EMU_PER_INCH),
        )

        if slide_no == 6:
            add_text_box(
                root,
                next_shape_id + 1,
                "Flow Caption",
                int(0.75 * EMU_PER_INCH),
                int(5.25 * EMU_PER_INCH),
                int(8.5 * EMU_PER_INCH),
                int(0.5 * EMU_PER_INCH),
                [("Shows the NGO-to-volunteer task lifecycle supported by SevaLink.", 16, False, "4A6078")],
            )

        zip_out.writestr(slide_path, ET.tostring(root, encoding="utf-8", xml_declaration=True))
        zip_out.writestr(rel_path, ET.tostring(rel_root, encoding="utf-8", xml_declaration=True))

    for media_name, media_path in media_map.items():
        zip_out.writestr(f"ppt/media/{media_name}", media_path.read_bytes())


def copy_unmodified_entries(zip_in, zip_out, skip_names):
    for item in zip_in.infolist():
        if item.filename in skip_names:
            continue
        zip_out.writestr(item, zip_in.read(item.filename))


def build_generated_assets():
    ensure_dir(GENERATED)
    process_flow = GENERATED / "process_flow.png"
    wireframe = GENERATED / "wireframe.png"
    architecture = GENERATED / "architecture.png"
    snapshots = GENERATED / "snapshots.png"
    create_process_flow(process_flow)
    create_wireframe(wireframe)
    create_architecture(architecture)
    create_snapshots(snapshots)
    return {
        "process_flow.png": process_flow,
        "wireframe.png": wireframe,
        "architecture.png": architecture,
        "snapshots.png": snapshots,
    }


def main():
    ensure_dir(GENERATED)
    media_map = build_generated_assets()

    skip = {
        *(f"ppt/slides/slide{n}.xml" for n in [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
        *(f"ppt/slides/_rels/slide{n}.xml.rels" for n in [6, 7, 8, 11]),
        *(f"ppt/media/{name}" for name in media_map),
    }

    with zipfile.ZipFile(TEMPLATE, "r") as zip_in, zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zip_out:
        copy_unmodified_entries(zip_in, zip_out, skip)
        update_slide_texts(zip_in, zip_out)
        add_slide_images(zip_in, zip_out, media_map)

    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
