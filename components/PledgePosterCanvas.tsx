"use client";
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

interface TuningParams {
  dropX?: number;
  dropY?: number;
  dropW?: number;
  dropH?: number;
  nameX?: number;
  nameY?: number;
  nameFontSize?: number;
  letterSpacing?: number;
  // Jungle layout (coords in source image space, base 2480x3508)
  rectX?: number;
  rectY?: number;
  rectW?: number;
  rectH?: number;
  rectAngleDeg?: number;
  nameOffsetY?: number;
  nameRightX?: number;
  nameColor?: string;
  // Event-partner branding (bottom of jungle certificate)
  partnerLabelY?: number;
  partnerLabelFs?: number;
  partnerLogoY?: number;
  partnerLogoH?: number;
}

// Custom certificate layout — all coords in 1080×1350 base space.
export interface CertNameBox {
  x: number;            // anchor x (meaning depends on align)
  y: number;            // vertical center
  fontSize: number;     // px at 1080 base
  color: string;
  align: 'left' | 'center' | 'right';
  maxW: number;         // max text width before shrink-to-fit
}
export interface CertPhotoBox {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;             // degrees
  shape?: 'rect' | 'circle';  // circle clips to an ellipse inside the box (default rect)
}
export interface CertImage {
  url: string;
  x: number;
  y: number;
  w: number;            // height derived from natural aspect
}
export interface CertTextBox {
  id: string;
  text: string;
  x: number;            // anchor x (meaning depends on align)
  y: number;            // vertical center
  fontSize: number;     // px at base
  color: string;
  align: 'left' | 'center' | 'right';
  maxW: number;         // max text width before shrink-to-fit
  weight?: 400 | 700;
  italic?: boolean;
}
export interface CertConfig {
  name?:   CertNameBox | null;
  photo?:  CertPhotoBox | null;
  images?: CertImage[];
  texts?:  CertTextBox[];
}

interface Props {
  userName:      string;
  bgImageUrl:    string;
  userPhotoUrl?: string | null;
  width?:        number;
  // kept for API compatibility — no longer used for rendering
  pledgeName?:   string;
  date?:         string;
  orgLogoUrl?:   string | null;
  logoPosition?: string | null;
  isQuiz?:       boolean;
  layout?:       string;
  tuning?:       TuningParams;
  cert?:         CertConfig | null;   // when set (with layout="custom"), drives placement
}

export const PledgePosterCanvas = forwardRef<HTMLCanvasElement, Props>(
  ({ userName, bgImageUrl, userPhotoUrl, width = 1080, orgLogoUrl, logoPosition, layout, tuning, cert }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useImperativeHandle(ref, () => canvasRef.current!);

    const draw = useCallback(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = width / 1080;
      // Use standard A4 aspect ratio (1:sqrt(2)) for water pledge
      const a4Ratio = 1123 / 794; /* approx 1.41435 */
      const h     = layout === 'water' ? Math.round(width * a4Ratio) : Math.round(1350 * scale);
      canvas.width  = width;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // ── CUSTOM LAYOUT (admin-defined coordinates) ────────────────────────
      // Coords are stored in the background image's own pixel space, so the
      // canvas is sized to the actual image aspect (no fixed 1080×1350).
      if (layout === 'custom' && cert) {
        let bg: HTMLImageElement | null = null;
        try {
          bg = await loadImage(bgImageUrl);
        } catch (err) {
          console.error('[PosterCanvas] custom bg load failed:', bgImageUrl, err);
        }

        const baseW = bg?.naturalWidth || bg?.width || 1080;
        const baseH = bg?.naturalHeight || bg?.height || 1350;
        const cscale = width / baseW;
        const ch = Math.round(width * (baseH / baseW));
        canvas.width = width;
        canvas.height = ch;

        // 1. Background — full bleed at the image's real aspect
        if (bg) {
          ctx.drawImage(bg, 0, 0, width, ch);
        } else {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0, 0, width, ch);
        }

        // 2. Photo slot — rect clip, optional rotation, cover-fill
        if (userPhotoUrl && cert.photo) {
          try {
            const photo = await loadImage(userPhotoUrl);
            const rx = cert.photo.x * cscale;
            const ry = cert.photo.y * cscale;
            const rw = cert.photo.w * cscale;
            const rh = cert.photo.h * cscale;
            const angle = (cert.photo.angle ?? 0) * (Math.PI / 180);

            ctx.save();
            if (angle) {
              ctx.translate(rx + rw / 2, ry + rh / 2);
              ctx.rotate(angle);
              ctx.translate(-(rx + rw / 2), -(ry + rh / 2));
            }
            ctx.beginPath();
            if (cert.photo.shape === 'circle') {
              ctx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
            } else {
              ctx.rect(rx, ry, rw, rh);
            }
            ctx.clip();
            const s  = Math.max(rw / photo.width, rh / photo.height);
            const pw = photo.width * s;
            const ph = photo.height * s;
            ctx.drawImage(photo, rx + (rw - pw) / 2, ry + (rh - ph) / 2, pw, ph);
            ctx.restore();
          } catch { /* skip photo */ }
        }

        // 3. Name — measure-and-shrink to fit maxW
        if (userName && cert.name) {
          const fontMontserrat = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-montserrat') || 'Montserrat';
          const n = cert.name;
          const nameX = n.x * cscale;
          const nameY = n.y * cscale;
          const maxW  = n.maxW * cscale;
          let fs = n.fontSize * cscale;

          ctx.shadowColor  = 'transparent';
          ctx.shadowBlur   = 0;
          ctx.textAlign    = n.align;
          ctx.textBaseline = 'middle';
          ctx.fillStyle    = n.color || '#1a2744';
          ctx.font         = `700 ${fs}px ${fontMontserrat}, sans-serif`;

          const measured = ctx.measureText(userName).width;
          if (maxW > 0 && measured > maxW) {
            fs = Math.max(14 * cscale, fs * (maxW / measured));
            ctx.font = `700 ${fs}px ${fontMontserrat}, sans-serif`;
          }
          ctx.fillText(userName, nameX, nameY);
        }

        // 3b. Custom text blocks — same measure-and-shrink as the name
        if (cert.texts && cert.texts.length) {
          const fontMontserrat = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-montserrat') || 'Montserrat';
          for (const t of cert.texts) {
            if (!t.text) continue;
            const tx = t.x * cscale;
            const ty = t.y * cscale;
            const maxW = t.maxW * cscale;
            const weight = t.weight ?? 700;
            const style = t.italic ? 'italic ' : '';
            let fs = t.fontSize * cscale;

            ctx.shadowColor  = 'transparent';
            ctx.shadowBlur   = 0;
            ctx.textAlign    = t.align;
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = t.color || '#1a2744';
            ctx.font         = `${style}${weight} ${fs}px ${fontMontserrat}, sans-serif`;

            const measured = ctx.measureText(t.text).width;
            if (maxW > 0 && measured > maxW) {
              fs = Math.max(14 * cscale, fs * (maxW / measured));
              ctx.font = `${style}${weight} ${fs}px ${fontMontserrat}, sans-serif`;
            }
            ctx.fillText(t.text, tx, ty);
          }
        }

        // 4. Overlay images (logos, sponsors) — aspect-preserving by width
        if (cert.images && cert.images.length) {
          for (const im of cert.images) {
            if (!im.url) continue;
            try {
              const img = await loadImage(im.url);
              const iw = im.w * cscale;
              const ih = (img.height / img.width) * iw;
              ctx.drawImage(img, im.x * cscale, im.y * cscale, iw, ih);
            } catch { /* skip this overlay */ }
          }
        }

        return; // done with custom layout
      }

      // ── WATER PLEDGE LAYOUT ──────────────────────────────────────────────
      if (layout === 'water') {
        // 1. Background poster — cover-fit so any uploaded poster fills A4 without distortion
        try {
          const bg = await loadImage(bgImageUrl);
          const bgRatio = bg.width / bg.height;
          const cvRatio = width / h;
          let bx = 0, by = 0, bw = width, bh = h;
          if (bgRatio > cvRatio) {
            bh = h; bw = h * bgRatio; bx = (width - bw) / 2;
          } else {
            bw = width; bh = width / bgRatio; by = 0;
          }
          ctx.drawImage(bg, bx, by, bw, bh);
        } catch (err) {
          console.error('[PosterCanvas] Failed to load background:', bgImageUrl, err);
          ctx.fillStyle = '#dbeafe';
          ctx.fillRect(0, 0, width, h);
        }

        // 2. User photo clipped to water drop shape
        if (userPhotoUrl) {
          try {
            const photo = await loadImage(userPhotoUrl);

            // Coordinates based on 794x1123 A4 canvas — drop below tap (~36% of width)
            const baseW = 794;
            const baseH = 1123;
            const dropX  = (tuning?.dropX ?? 155 * (width / baseW));
            const dropY  = (tuning?.dropY ?? 340 * (h / baseH));
            const dropW  = (tuning?.dropW ?? 260 * (width / baseW));
            const dropH  = (tuning?.dropH ?? 380 * (h / baseH));
            
            const cx     = dropX + dropW / 2;
            const r      = dropW / 2;     // radius of the circular bottom
            const circCY = dropY + dropH - r; // centre-Y of the bottom circle

            ctx.save();
            // Refined teardrop clipping path — narrow tip, gradual swell, circular base
            ctx.beginPath();
            ctx.moveTo(cx, dropY); // sharp tip at top

            // Right side: stays narrow for top 30%, then sweeps out to full width
            ctx.bezierCurveTo(
              cx + r * 0.22, dropY + dropH * 0.28,  // hug the centreline longer
              cx + r,        circCY - r * 0.75,       // reach full width near base
              cx + r,        circCY                   // rightmost point of circle
            );
            // Bottom arc: right → left clockwise through bottom
            ctx.arc(cx, circCY, r, 0, Math.PI);
            // Left side: mirror of right
            ctx.bezierCurveTo(
              cx - r,        circCY - r * 0.75,
              cx - r * 0.22, dropY + dropH * 0.28,
              cx,            dropY
            );
            ctx.closePath();
            ctx.clip();

            // Cover-fill photo inside the drop
            const s  = Math.max(dropW / photo.width, dropH / photo.height);
            const pw = photo.width * s;
            const ph = photo.height * s;
            ctx.drawImage(photo, dropX + (dropW - pw) / 2, dropY + (dropH - ph) / 2, pw, ph);
            ctx.restore();

            // Border around the water drop — same color as name font
            ctx.beginPath();
            ctx.moveTo(cx, dropY);
            ctx.bezierCurveTo(
              cx + r * 0.22, dropY + dropH * 0.28,
              cx + r,        circCY - r * 0.75,
              cx + r,        circCY
            );
            ctx.arc(cx, circCY, r, 0, Math.PI);
            ctx.bezierCurveTo(
              cx - r,        circCY - r * 0.75,
              cx - r * 0.22, dropY + dropH * 0.28,
              cx,            dropY
            );
            ctx.closePath();
            ctx.strokeStyle = '#00063d';
            ctx.lineWidth   = 3 * scale;
            ctx.stroke();
          } catch { /* skip photo */ }
        }

        // 3. Name — Big Shoulders Display Bold, loaded via FontFace API
        if (userName) {
          const fontName = 'Big Shoulders Display';
          const alreadyLoaded = [...document.fonts].some(f => f.family === fontName && f.status === 'loaded');
          if (!alreadyLoaded) {
            try {
              const font = new FontFace(
                fontName,
                'url(/fonts/BigShouldersDisplay-Bold.woff2)',
                { weight: '700', style: 'normal' }
              );
              const loaded = await font.load();
              document.fonts.add(loaded);
            } catch { /* fallback gracefully */ }
          }

          // Name aligned with title column: left edge ~52%, right edge ~80% of width
          const nameX    = tuning?.nameX ?? (0.52 * width + 4 * scale);
          const nameY    = tuning?.nameY ?? (0.34 * h);
          const nameMaxW = (0.92 * width) - nameX;

          const displayName = userName.toUpperCase();
          const fsMax = tuning?.nameFontSize ?? (65 * (width / 794));

          ctx.shadowColor  = 'transparent';
          ctx.shadowBlur   = 0;
          ctx.textAlign    = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle    = '#00063d';

          // Set letter spacing first so measureText accounts for it
          const letterSpacingPx = (tuning?.letterSpacing ?? 4) * scale;
          if ('letterSpacing' in ctx) {
            (ctx as any).letterSpacing = `${letterSpacingPx}px`;
          }

          // Measure at max size, then scale down proportionally to fit
          ctx.font = `700 ${fsMax}px "${fontName}", sans-serif`;
          const measured = ctx.measureText(displayName).width;
          let fs = fsMax;
          if (measured > nameMaxW) {
            fs = Math.max(20 * scale, fsMax * (nameMaxW / measured));
            ctx.font = `700 ${fs}px "${fontName}", sans-serif`;
          }

          ctx.fillText(displayName, nameX, nameY);

          if ('letterSpacing' in ctx) {
            (ctx as any).letterSpacing = '0px';
          }
        }

        // 4. Org logo overlay
        if (orgLogoUrl) {
          try {
            const logo = await loadImage(orgLogoUrl);
            let lx = 200 * scale, ly = h - (250 * scale), lw = 150 * scale; // Default bottom-leftish
            if (logoPosition) {
              try {
                const pos = JSON.parse(logoPosition);
                if (pos.x !== undefined) lx = pos.x * scale;
                if (pos.y !== undefined) ly = pos.y * scale;
                if (pos.w !== undefined) lw = pos.w * scale;
              } catch { /* use defaults */ }
            }
            const lh = (logo.height / logo.width) * lw;
            ctx.drawImage(logo, lx, ly, lw, lh);
          } catch { /* skip if logo fails */ }
        }

        return; // done with water layout
      }

      // ── JUNGLE LAYOUT (Hanon Kids Summer Camp 2026) ─────────────────────
      if (layout === 'jungle') {
        // 1. Background poster (full bleed, A4)
        try {
          const bg = await loadImage(bgImageUrl);
          ctx.drawImage(bg, 0, 0, width, h);
        } catch (err) {
          console.error('[PosterCanvas] Failed to load background:', bgImageUrl, err);
          ctx.fillStyle = '#e8f5d8';
          ctx.fillRect(0, 0, width, h);
        }

        // Coordinates referenced to the source image (2480 × 3508)
        const baseW = 2480;
        const baseH = 3508;

        // White photo rectangle on the right — defaults tuned against the source image
        const rxSrc = tuning?.rectX ?? 1465;
        const rySrc = tuning?.rectY ?? 1085;
        const rwSrc = tuning?.rectW ?? 850;
        const rhSrc = tuning?.rectH ?? 1010;
        const rx    = (rxSrc / baseW) * width;
        const ry    = (rySrc / baseH) * h;
        const rw    = (rwSrc / baseW) * width;
        const rh    = (rhSrc / baseH) * h;
        const angle = (tuning?.rectAngleDeg ?? -13.5) * (Math.PI / 180);

        // 2. Photo — rotated rectangle clip, cover-fill
        if (userPhotoUrl) {
          try {
            const photo = await loadImage(userPhotoUrl);
            ctx.save();
            ctx.translate(rx + rw / 2, ry + rh / 2);
            ctx.rotate(angle);
            ctx.translate(-(rx + rw / 2), -(ry + rh / 2));

            ctx.beginPath();
            ctx.rect(rx, ry, rw, rh);
            ctx.clip();

            const s  = Math.max(rw / photo.width, rh / photo.height);
            const pw = photo.width  * s;
            const ph = photo.height * s;
            ctx.drawImage(photo, rx + (rw - pw) / 2, ry + (rh - ph) / 2, pw, ph);
            ctx.restore();
          } catch { /* skip photo */ }
        }

        // 3. Name — centred under the photo column
        if (userName) {
          const fontMontserrat = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-montserrat') || 'Montserrat';

          // Right anchor aligns with the right edge of the "Presented for…" paragraph
          const rightAnchorSrc = tuning?.nameRightX ?? 2378;
          const nameRX     = (rightAnchorSrc / baseW) * width;
          const nameOffset = tuning?.nameOffsetY ?? 330;
          const nameY      = ry + rh + (nameOffset / baseH) * h;
          // Column the name lives in — from a sensible left margin to the right anchor
          const nameMaxW   = nameRX - ((1280 / baseW) * width);

          // Length-based starting font size (custom per name length)
          const maxLen   = Math.max(1, userName.length);
          const defaultFs = maxLen > 18 ? 56 : maxLen > 12 ? 64 : 72;
          let fs = (tuning?.nameFontSize ?? defaultFs) * (width / 1080);

          ctx.shadowColor  = 'transparent';
          ctx.shadowBlur   = 0;
          ctx.textAlign    = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillStyle    = tuning?.nameColor ?? '#1a4480';
          ctx.font         = `700 ${fs}px ${fontMontserrat}, sans-serif`;

          // Measure and shrink to fit the column without horizontal distortion
          const measured = ctx.measureText(userName).width;
          if (measured > nameMaxW) {
            fs = Math.max(18 * scale, fs * (nameMaxW / measured));
            ctx.font = `700 ${fs}px ${fontMontserrat}, sans-serif`;
          }

          ctx.fillText(userName, nameRX, nameY);
        }

        // 4. Org logo overlay (optional)
        if (orgLogoUrl) {
          try {
            const logo = await loadImage(orgLogoUrl);
            let lx = 200 * scale, ly = 1100 * scale, lw = 150 * scale;
            if (logoPosition) {
              try {
                const pos = JSON.parse(logoPosition);
                if (pos.x !== undefined) lx = pos.x * scale;
                if (pos.y !== undefined) ly = pos.y * scale;
                if (pos.w !== undefined) lw = pos.w * scale;
              } catch { /* defaults */ }
            }
            const lh = (logo.height / logo.width) * lw;
            ctx.drawImage(logo, lx, ly, lw, lh);
          } catch { /* skip logo */ }
        }

        // 5. "Event Partner" label + EZONE logo at the bottom centre
        try {
          const partnerFont = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-montserrat') || 'Montserrat';
          const labelYSrc = tuning?.partnerLabelY ?? 3255;
          const labelFs   = (tuning?.partnerLabelFs ?? 21) * (width / 1080);
          const logoYSrc  = tuning?.partnerLogoY  ?? 3315;
          const logoHSrc  = tuning?.partnerLogoH  ?? 128;

          // Label
          ctx.shadowColor  = 'transparent';
          ctx.shadowBlur   = 0;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle    = '#000000';
          ctx.font         = `700 ${labelFs}px ${partnerFont}, sans-serif`;
          ctx.fillText('Event Partner', width / 2, (labelYSrc / baseH) * h);

          // EZONE logo
          const ezone = await loadImage('/images/ezone-logo.png');
          const logoH = (logoHSrc / baseH) * h;
          const logoW = (ezone.width / ezone.height) * logoH;
          const logoX = (width - logoW) / 2;
          const logoY = (logoYSrc / baseH) * h;
          ctx.drawImage(ezone, logoX, logoY, logoW, logoH);
        } catch (err) {
          console.warn('[Jungle] event partner branding render failed:', err);
        }

        return; // done with jungle layout
      }

      // ── DEFAULT / SPARROW LAYOUT ─────────────────────────────────────────

      // 1. Background poster (full bleed)
      try {
        const bg = await loadImage(bgImageUrl);
        ctx.drawImage(bg, 0, 0, width, h);
      } catch (err) {
        console.error('[PosterCanvas] Failed to load background:', bgImageUrl, err);
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, h);
      }

      // 2. Photo — rectangle slot matched to the white placeholder on the poster
      const baseW = 2500;
      const baseH = 3536;

      const rx = ((1321.2 + 190) / baseW) * width;
      const ry = ((720.3 + 100) / baseH) * h;
      const rw = ((998 - 190) / baseW) * width;
      const rh = (974.1 / baseH) * h;
      const angle = -10.2 * (Math.PI / 180);

      if (userPhotoUrl) {
        try {
          const photo = await loadImage(userPhotoUrl);
          ctx.save();

          // Move to center of the photo area to apply rotation
          ctx.translate(rx + rw/2, ry + rh/2);
          ctx.rotate(angle);
          ctx.translate(-(rx + rw/2), -(ry + rh/2));

          ctx.beginPath();
          ctx.rect(rx, ry, rw, rh);
          ctx.clip();
          // cover-fill: scale photo to fill the rect without distortion
          const s  = Math.max(rw / photo.width, rh / photo.height);
          const pw = photo.width * s;
          const ph = photo.height * s;
          ctx.drawImage(photo, rx + (rw - pw) / 2, ry + (rh - ph) / 2, pw, ph);
          ctx.restore();
        } catch { /* skip */ }
      }

      // 3. Name — below the photo, centred on the slot
      if (userName) {
        const fontMontserrat = getComputedStyle(document.documentElement)
          .getPropertyValue('--font-montserrat') || 'Montserrat';

        const nameXBase  = 992.4 + 1345.9;
        const nameYBase  = 1950.4 + (185.1 / 2);
        const nameMaxW   = (1345.9 / baseW) * width;

        const nameX = (nameXBase / baseW) * width;
        const nameY = (nameYBase / baseH) * h;

        const maxLen = Math.max(1, userName.length);
        const fs     = (maxLen > 18 ? 50 : maxLen > 12 ? 65 : 80) * scale;

        ctx.shadowColor  = 'transparent';
        ctx.shadowBlur   = 0;
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'middle';
        ctx.font         = `700 ${fs}px ${fontMontserrat}, sans-serif`;
        ctx.fillStyle    = '#1a2744';

        ctx.fillText(userName, nameX, nameY, nameMaxW);
      }

      // 4. Org logo overlay
      if (orgLogoUrl) {
        try {
          const logo = await loadImage(orgLogoUrl);
          let lx = 200 * scale, ly = 1100 * scale, lw = 150 * scale;
          if (logoPosition) {
            try {
              const pos = JSON.parse(logoPosition);
              if (pos.x !== undefined) lx = pos.x * scale;
              if (pos.y !== undefined) ly = pos.y * scale;
              if (pos.w !== undefined) lw = pos.w * scale;
            } catch { /* use defaults */ }
          }
          const lh = (logo.height / logo.width) * lw;
          ctx.drawImage(logo, lx, ly, lw, lh);
        } catch { /* skip if logo fails */ }
      }

    }, [userName, bgImageUrl, userPhotoUrl, width, orgLogoUrl, logoPosition, layout, tuning, cert]);

    useEffect(() => { draw(); }, [draw]);

    return <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 12, display: 'block' }} />;
  }
);
PledgePosterCanvas.displayName = 'PledgePosterCanvas';

// Cache decoded images by URL so repeated redraws (e.g. live dragging in the
// certificate designer) don't refetch/redecode the same bitmap each frame.
const _imageCache = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (src: string): Promise<HTMLImageElement> => {
  const cached = _imageCache.get(src);
  if (cached) return cached;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const isAbsoluteExternal = src.startsWith('http') && !src.startsWith(window.location.origin);
    if (isAbsoluteExternal) {
      img.crossOrigin = 'anonymous';
    }
    img.onload  = () => resolve(img);
    img.onerror = (e) => { _imageCache.delete(src); reject(e); }; // allow retry on failure
    // Make relative URLs absolute so the canvas context can always resolve them
    img.src = src.startsWith('/') ? `${window.location.origin}${src}` : src;
  });
  _imageCache.set(src, p);
  return p;
};
