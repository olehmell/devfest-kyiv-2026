const WIDTH = 1080;
const HEIGHT = 1350;
const BLACK = '#000000';
const WHITE = '#ffffff';
const BLUE = '#1f5bd8';
const FONT = 'Onest, system-ui, sans-serif';
const TITLE = 'Мій DevFest нетворкінг';
const CELL_WIDTH = 476;
const CELL_HEIGHT = 122;
const CELL_GAP = 16;
const MARGIN = 56;

function setFont(ctx, size, weight) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
}

function drawPhoto(ctx, photo) {
  const size = 450;
  const border = 6;
  const x = (WIDTH - size) / 2;
  const y = 200;
  const crop = Math.min(photo.naturalWidth, photo.naturalHeight);
  const cropX = (photo.naturalWidth - crop) / 2;
  const cropY = (photo.naturalHeight - crop) / 2;

  ctx.fillStyle = BLUE;
  ctx.fillRect(x - border, y - border, size + 2 * border, size + 2 * border);
  ctx.fillStyle = '#161616';
  ctx.fillRect(x, y, size, size);
  ctx.drawImage(photo, cropX, cropY, crop, crop, x, y, size, size);
}

function wrapLabel(ctx, label, width) {
  const lines = [];
  let line = '';

  for (const word of label.trim().split(/\s+/u)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }

    if (line) lines.push(line);
    line = '';
    for (const character of word) {
      if (line && ctx.measureText(line + character).width > width) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function fitLabel(ctx, label, width, height) {
  let lines;
  let lineHeight;
  for (let size = 34; size >= 22; size -= 2) {
    setFont(ctx, size, 700);
    lineHeight = Math.ceil(size * 1.15);
    lines = wrapLabel(ctx, label, width);
    if (lines.length * lineHeight <= height) return { lines, lineHeight };
  }

  lines = lines.slice(0, Math.floor(height / lineHeight));
  const lastLine = Array.from(lines.pop());
  while (ctx.measureText(lastLine.join('') + '…').width > width) lastLine.pop();
  lines.push(lastLine.join('').trimEnd() + '…');
  return { lines, lineHeight };
}

function drawCheck(ctx, x, y, checked) {
  const size = 41;
  ctx.lineWidth = 4;
  if (checked) {
    ctx.fillStyle = BLUE;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = WHITE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 21);
    ctx.lineTo(x + 17, y + 28);
    ctx.lineTo(x + 31, y + 13);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#b7b7b7';
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
  }
}

function drawTask(ctx, { label, checked }, index) {
  const x = MARGIN + (index % 2) * (CELL_WIDTH + CELL_GAP);
  const y = 913 + Math.floor(index / 2) * (CELL_HEIGHT + CELL_GAP);
  ctx.fillStyle = checked ? WHITE : '#161616';
  ctx.fillRect(x, y, CELL_WIDTH, CELL_HEIGHT);
  if (!checked) {
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, CELL_WIDTH - 2, CELL_HEIGHT - 2);
  }

  drawCheck(ctx, x + 24, y + (CELL_HEIGHT - 41) / 2, checked);

  const { lines, lineHeight } = fitLabel(ctx, label, CELL_WIDTH - 110, CELL_HEIGHT - 26);
  const firstLine = y + CELL_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;
  ctx.fillStyle = checked ? BLACK : WHITE;
  ctx.textBaseline = 'middle';
  for (const [lineIndex, line] of lines.entries()) {
    ctx.fillText(line, x + 84, firstLine + lineIndex * lineHeight);
  }
}

export async function drawNetworkingCard(canvas, { photo, logo, connections, tasks }) {
  // Explicit samples load the Cyrillic subset before the first canvas render.
  const fonts = canvas.ownerDocument.fonts;
  if (fonts) {
    await Promise.allSettled([
      fonts.load('900 64px Onest', TITLE + ' 0123456789'),
      fonts.load('800 48px Onest', 'БІНГО 0123456789'),
      fonts.load('700 34px Onest', 'Нові контакти в LinkedIn сьогодні ' + tasks.map(task => task.label).join(' ')),
    ]);
  }

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = WHITE;
  setFont(ctx, 64, 900);
  ctx.fillText(TITLE, MARGIN, 125, 750);

  const logoWidth = 186;
  ctx.drawImage(logo, 842, 31, logoWidth, logoWidth * logo.naturalHeight / logo.naturalWidth);

  drawPhoto(ctx, photo);

  ctx.fillStyle = BLUE;
  polygon(ctx, [[51, 678], [1026, 653], [1021, 814], [57, 814]]);
  ctx.fill();

  const count = new Intl.NumberFormat('uk-UA').format(connections);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = WHITE;
  let countSize = 136;
  setFont(ctx, countSize, 900);
  const countWidth = ctx.measureText(count).width;
  if (countWidth > 331) {
    countSize = Math.floor((countSize * 331) / countWidth);
    setFont(ctx, countSize, 900);
  }
  ctx.fillText(count, 84, 744, 331);
  ctx.fillStyle = '#d7e3ff';
  ctx.fillRect(443, 691, 3, 95);
  ctx.fillStyle = WHITE;
  setFont(ctx, 40, 700);
  ctx.fillText('Нові контакти', 478, 717);
  ctx.fillText('в LinkedIn сьогодні', 478, 768);

  setFont(ctx, 47, 800);
  ctx.fillText('БІНГО', MARGIN, 866);
  const complete = tasks.filter(task => task.checked).length;
  ctx.fillStyle = '#d7e3ff';
  setFont(ctx, 37, 800);
  ctx.textAlign = 'right';
  ctx.fillText(`${complete} / ${tasks.length}`, WIDTH - MARGIN, 868);

  ctx.textAlign = 'left';
  tasks.forEach((task, index) => drawTask(ctx, task, index));
  return canvas;
}
