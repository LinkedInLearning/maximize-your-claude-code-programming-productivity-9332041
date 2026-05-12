import pptxgen from 'pptxgenjs';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const data = JSON.parse(fs.readFileSync(path.join(HERE, 'output/pitch_data.json'), 'utf8'));

const NAVY = '1E2761';
const NAVY_LIGHT = '2C3F88';
const ICE = 'CADCFC';
const WHITE = 'FFFFFF';
const YELLOW = 'FFD200';
const TEAL = '02C39A';
const TEXT_DARK = '1E2761';
const TEXT_MUTED = '64748B';
const BG_LIGHT = 'F8FAFC';

const HEADER = 'Georgia';
const BODY = 'Calibri';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Data Insights';
pres.title = 'NYC Billboard Placement Pitch';

const fmtMoney = v => `$${Number(v).toFixed(2)}`;
const fmtMoneyInt = v => `$${Math.round(Number(v)).toLocaleString()}`;
const totalRides = data.taxi_total_trips + data.rs_total_trips;
const fmtMillions = n => `${(n / 1e6).toFixed(1)}M`;

// ============================================================
// Slide 1 — Title
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addShape(pres.shapes.OVAL, { x: 0.8, y: 0.8, w: 0.45, h: 0.45, fill: { color: YELLOW }, line: { color: YELLOW } });
  s.addShape(pres.shapes.OVAL, { x: 1.35, y: 0.8, w: 0.45, h: 0.45, fill: { color: TEAL }, line: { color: TEAL } });

  s.addText('Where to put NYC billboards', {
    x: 0.8, y: 1.8, w: 11.7, h: 1.3,
    fontFace: HEADER, fontSize: 54, bold: true, color: WHITE, align: 'left', margin: 0,
  });
  s.addText('Pickup zones ranked by premium rider spend — yellow taxi + rideshare, Nov 2022.', {
    x: 0.8, y: 3.1, w: 11.7, h: 0.7,
    fontFace: BODY, fontSize: 20, color: ICE, align: 'left', margin: 0, italic: true,
  });

  // Headline stat — pull up so the title block and stat read as one unit
  s.addText(fmtMillions(totalRides) + '+', {
    x: 0.8, y: 3.9, w: 7.0, h: 1.55,
    fontFace: HEADER, fontSize: 110, bold: true, color: YELLOW, align: 'left', margin: 0,
  });
  s.addText('rides analyzed across NYC', {
    x: 0.8, y: 5.45, w: 7.0, h: 0.5,
    fontFace: BODY, fontSize: 16, color: ICE, align: 'left', margin: 0,
  });

  s.addText('Yellow taxi + rideshare · November 2022', {
    x: 0.8, y: 5.95, w: 7.0, h: 0.4,
    fontFace: BODY, fontSize: 13, italic: true, color: ICE, align: 'left', margin: 0,
  });

  s.addText('Prepared for executive review', {
    x: 8.0, y: 6.85, w: 4.5, h: 0.35,
    fontFace: BODY, fontSize: 11, color: ICE, align: 'right', margin: 0,
  });
}

// ============================================================
// Slide 2 — Why high-fare zones = premium ad attention
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: BG_LIGHT };

  s.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.45, w: 0.32, h: 0.32, fill: { color: ICE }, line: { color: ICE } });
  s.addText('Why high-fare zones = premium ad attention', {
    x: 1.0, y: 0.38, w: 12, h: 0.6,
    fontFace: HEADER, fontSize: 30, bold: true, color: TEXT_DARK, align: 'left', margin: 0,
  });

  // Left: thesis bullets
  s.addText('Thesis', {
    x: 0.6, y: 1.3, w: 6.0, h: 0.4,
    fontFace: HEADER, fontSize: 18, bold: true, color: TEXT_DARK, margin: 0,
  });
  s.addText([
    { text: 'Longer fares = longer dwell.', options: { bold: true, color: TEXT_DARK } },
    { text: ' Premium pickups (airports, business corridors) involve 5–10 min curbside waits — eye-on-billboard seconds compound across millions of rides.', options: { color: TEXT_DARK, breakLine: true } },
    { text: '\n', options: { breakLine: true } },
    { text: 'Higher fares index to higher discretionary spend.', options: { bold: true, color: TEXT_DARK } },
    { text: ' Riders paying $60+ skew business-traveler / decision-maker — the demographic advertisers pay a premium to reach.', options: { color: TEXT_DARK, breakLine: true } },
    { text: '\n', options: { breakLine: true } },
    { text: 'Volume gating keeps spend honest.', options: { bold: true, color: TEXT_DARK } },
    { text: ' Filtering to zones with ≥1,000 trips ensures each impression dollar buys a defensible audience size, not a statistical fluke.', options: { color: TEXT_DARK } },
  ], {
    x: 0.6, y: 1.7, w: 6.0, h: 4.8,
    fontFace: BODY, fontSize: 14, color: TEXT_DARK,
    paraSpaceAfter: 8, valign: 'top', margin: 0,
  });

  // Right: stat callouts — align top with "Thesis" header and use the full vertical band
  const statBoxes = [
    { label: 'rides analyzed', value: fmtMillions(totalRides) + '+', accent: YELLOW },
    { label: 'pickup zones met the 1,000-trip floor', value: `${data.eligible_zones_taxi + data.eligible_zones_rs}`, accent: ICE },
    { label: 'services compared (yellow taxi vs HVFHV rideshare)', value: '2', accent: TEAL },
  ];
  let y = 1.3;
  for (const { label, value, accent } of statBoxes) {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.4, y, w: 5.4, h: 1.65,
      fill: { color: WHITE }, line: { color: ICE, width: 1 },
      shadow: { type: 'outer', color: '000000', blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 7.4, y, w: 0.12, h: 1.65,
      fill: { color: accent }, line: { color: accent },
    });
    s.addText(value, {
      x: 7.7, y: y + 0.15, w: 3.2, h: 0.95,
      fontFace: HEADER, fontSize: 54, bold: true, color: TEXT_DARK, margin: 0, valign: 'middle',
    });
    s.addText(label, {
      x: 7.7, y: y + 1.1, w: 4.9, h: 0.5,
      fontFace: BODY, fontSize: 12, color: TEXT_MUTED, margin: 0,
    });
    y += 1.78;
  }

  s.addText(`Method: avg passenger spend per trip, ${data.window}, only ${data.volume_filter}.`, {
    x: 0.6, y: 6.9, w: 12.2, h: 0.4,
    fontFace: BODY, fontSize: 11, italic: true, color: TEXT_MUTED, align: 'left', margin: 0,
  });
}

// ============================================================
// Slide 3 — Top zones taxi vs rideshare (combined, varied graphics)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: BG_LIGHT };

  s.addText('Top zones by average fare', {
    x: 0.6, y: 0.38, w: 8, h: 0.6,
    fontFace: HEADER, fontSize: 30, bold: true, color: TEXT_DARK, align: 'left', margin: 0,
  });
  s.addShape(pres.shapes.OVAL, { x: 11.55, y: 0.5, w: 0.35, h: 0.35, fill: { color: YELLOW }, line: { color: YELLOW } });
  s.addShape(pres.shapes.OVAL, { x: 12.0,  y: 0.5, w: 0.35, h: 0.35, fill: { color: TEAL }, line: { color: TEAL } });

  // LEFT: taxi top-10 as PNG bar chart (embedded image renders reliably in PowerPoint + Keynote)
  s.addText('Yellow Taxi', {
    x: 0.6, y: 1.05, w: 5.5, h: 0.4,
    fontFace: HEADER, fontSize: 16, bold: true, color: TEXT_DARK, margin: 0,
  });
  s.addImage({
    path: path.join(HERE, 'output/taxi_top_bar.png'),
    x: 0.4, y: 1.45, w: 6.4, h: 5.4,
    sizing: { type: 'contain', w: 6.4, h: 5.4 },
  });

  // RIGHT: rideshare ranked card stack
  s.addText('Rideshare (HVFHV)', {
    x: 7.0, y: 1.05, w: 6.0, h: 0.4,
    fontFace: HEADER, fontSize: 16, bold: true, color: TEXT_DARK, margin: 0,
  });
  const cardX = 7.0;
  const cardW = 6.0;
  const cardH = 0.5;
  const cardGap = 0.04;
  let cy = 1.5;
  data.rideshare_top.forEach((row, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: cardX, y: cy, w: cardW, h: cardH,
      fill: { color: WHITE }, line: { color: i === 0 ? TEAL : 'E2E8F0', width: i === 0 ? 1.5 : 0.75 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: cardX, y: cy, w: 0.08, h: cardH,
      fill: { color: i === 0 ? TEAL : NAVY_LIGHT }, line: { color: i === 0 ? TEAL : NAVY_LIGHT },
    });
    s.addText(`${String(i + 1).padStart(2, '0')}`, {
      x: cardX + 0.15, y: cy, w: 0.55, h: cardH,
      fontFace: HEADER, fontSize: 16, bold: true,
      color: i === 0 ? TEAL : NAVY, valign: 'middle', margin: 0,
    });
    s.addText(row.zone, {
      x: cardX + 0.75, y: cy, w: 3.2, h: cardH,
      fontFace: BODY, fontSize: 13, bold: true, color: TEXT_DARK, valign: 'middle', margin: 0,
    });
    s.addText(row.borough, {
      x: cardX + 3.95, y: cy, w: 1.0, h: cardH,
      fontFace: BODY, fontSize: 10, color: TEXT_MUTED, valign: 'middle', margin: 0,
    });
    s.addText(fmtMoney(row.avg_total), {
      x: cardX + 5.0, y: cy, w: 0.95, h: cardH,
      fontFace: HEADER, fontSize: 14, bold: true, color: i === 0 ? TEAL : TEXT_DARK,
      align: 'right', valign: 'middle', margin: 0,
    });
    cy += cardH + cardGap;
  });

  s.addText(`${data.overlap_count} zone${data.overlap_count === 1 ? '' : 's'} appear on both top-10 lists — see next slide.`, {
    x: 0.6, y: 7.0, w: 12.2, h: 0.35,
    fontFace: BODY, fontSize: 11, italic: true, color: TEXT_MUTED, align: 'left', margin: 0,
  });
}

// ============================================================
// Slide 4 — Overlap zones (map)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.45, w: 0.32, h: 0.32, fill: { color: YELLOW }, line: { color: YELLOW } });
  s.addText('Bets that win on both services', {
    x: 1.0, y: 0.38, w: 12, h: 0.6,
    fontFace: HEADER, fontSize: 30, bold: true, color: WHITE, align: 'left', margin: 0,
  });
  s.addText('Zones in the top-10 for both yellow taxi AND rideshare carry the highest-confidence ad spend.', {
    x: 1.0, y: 0.95, w: 11.5, h: 0.4,
    fontFace: BODY, fontSize: 13, italic: true, color: ICE, align: 'left', margin: 0,
  });

  // Left: map
  s.addImage({
    path: path.join(HERE, 'output/overlap_map.png'),
    x: 0.6, y: 1.5, w: 6.8, h: 5.6,
    sizing: { type: 'contain', w: 6.8, h: 5.6 },
  });

  // Right: callout cards for overlap zones, sized to fill the right column evenly
  const callouts = data.overlap_zones.slice(0, 4);
  const colTop = 1.5;
  const colHeight = 5.5;
  const cardCount = callouts.length;
  if (cardCount > 0) {
    const cardGap = 0.25;
    const cardH = (colHeight - cardGap * (cardCount - 1)) / cardCount;
    let cy = colTop;
    for (const z of callouts) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: 7.8, y: cy, w: 5.0, h: cardH,
        fill: { color: NAVY_LIGHT }, line: { color: YELLOW, width: 1.5 },
      });
      s.addText(z.zone, {
        x: 8.0, y: cy + 0.2, w: 4.6, h: 0.55,
        fontFace: HEADER, fontSize: 22, bold: true, color: WHITE, margin: 0, valign: 'top',
      });
      s.addText(`${z.borough} · taxi ${fmtMoney(z.taxi_avg)} · rideshare ${fmtMoney(z.rs_avg)}`, {
        x: 8.0, y: cy + 0.85, w: 4.6, h: 0.4,
        fontFace: BODY, fontSize: 12, color: ICE, margin: 0,
      });
      s.addText(`Blended avg ${fmtMoney(z.blended)}`, {
        x: 8.0, y: cy + cardH - 0.6, w: 4.6, h: 0.45,
        fontFace: HEADER, fontSize: 16, bold: true, color: YELLOW, margin: 0, valign: 'middle',
      });
      cy += cardH + cardGap;
    }
  } else {
    s.addText('No zones cleared the top-10 in both services — see slide 5 for single-service picks.', {
      x: 7.8, y: 3.5, w: 5.0, h: 0.8,
      fontFace: BODY, fontSize: 14, italic: true, color: ICE, margin: 0,
    });
  }
}

// ============================================================
// Slide 5 — Recommendation: Three places to buy
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addText('Three places to buy', {
    x: 0.6, y: 0.45, w: 12, h: 0.65,
    fontFace: HEADER, fontSize: 32, bold: true, color: WHITE, align: 'left', margin: 0,
  });
  s.addText('Ranked by blended average fare across yellow taxi and rideshare, Nov 2022.', {
    x: 0.6, y: 1.05, w: 12, h: 0.4,
    fontFace: BODY, fontSize: 13, italic: true, color: ICE, align: 'left', margin: 0,
  });

  const cardW = 4.0;
  const gap = 0.25;
  const totalW = cardW * 3 + gap * 2;
  const startX = (13.33 - totalW) / 2;
  const cardY = 1.85;
  const cardH = 4.9;
  const accents = [YELLOW, TEAL, ICE];

  data.top_3_picks.forEach((pick, i) => {
    const cx = startX + i * (cardW + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cardY, w: cardW, h: cardH,
      fill: { color: WHITE }, line: { color: WHITE },
      shadow: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 90, opacity: 0.25 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cardY, w: cardW, h: 0.18,
      fill: { color: accents[i] }, line: { color: accents[i] },
    });
    s.addShape(pres.shapes.OVAL, {
      x: cx + cardW / 2 - 0.45, y: cardY + 0.45, w: 0.9, h: 0.9,
      fill: { color: NAVY }, line: { color: NAVY },
    });
    s.addText(String(i + 1), {
      x: cx + cardW / 2 - 0.45, y: cardY + 0.45, w: 0.9, h: 0.9,
      fontFace: HEADER, fontSize: 36, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0,
    });
    s.addText(pick.zone, {
      x: cx + 0.2, y: cardY + 1.55, w: cardW - 0.4, h: 0.7,
      fontFace: HEADER, fontSize: 20, bold: true, color: TEXT_DARK, align: 'center', margin: 0,
    });
    s.addText(pick.borough, {
      x: cx + 0.2, y: cardY + 2.2, w: cardW - 0.4, h: 0.35,
      fontFace: BODY, fontSize: 12, color: TEXT_MUTED, align: 'center', margin: 0,
    });
    s.addText(fmtMoney(pick.blended), {
      x: cx + 0.2, y: cardY + 2.65, w: cardW - 0.4, h: 0.7,
      fontFace: HEADER, fontSize: 36, bold: true, color: NAVY, align: 'center', margin: 0,
    });
    s.addText('avg fare', {
      x: cx + 0.2, y: cardY + 3.3, w: cardW - 0.4, h: 0.3,
      fontFace: BODY, fontSize: 10, color: TEXT_MUTED, align: 'center', margin: 0,
    });
    s.addText(pick.rationale, {
      x: cx + 0.25, y: cardY + 3.7, w: cardW - 0.5, h: 1.1,
      fontFace: BODY, fontSize: 11, color: TEXT_DARK, align: 'center', valign: 'top', margin: 0,
    });
  });

  s.addText('Source: sample_data.nyc.taxi & sample_data.nyc.rideshare via MotherDuck, Nov 2022.', {
    x: 0.6, y: 7.0, w: 12.2, h: 0.4,
    fontFace: BODY, fontSize: 10, italic: true, color: ICE, align: 'left', margin: 0,
  });
}

await pres.writeFile({ fileName: path.join(HERE, 'output/billboard_pitch.pptx') });
console.log('wrote output/billboard_pitch.pptx');
