import { ImageResponse } from 'next/og';

export const alt = 'Dada Beauty — Institut de beauté à Guédiawaye, Dakar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(150deg, #F8E9ED 0%, #EBC4CF 55%, #E7D5B5 100%)', color: '#292329', fontFamily: 'serif' }}>
        <div style={{ fontSize: 30, letterSpacing: 10, textTransform: 'uppercase', color: '#8F7240' }}>Institut de beauté</div>
        <div style={{ fontSize: 150, fontStyle: 'italic', marginTop: 10 }}>Dada Beauty</div>
        <div style={{ width: 240, height: 2, background: '#C6A56B', margin: '24px 0' }} />
        <div style={{ fontSize: 34, color: '#4A3F48' }}>Makeup · Onglerie · Cils · Coiffure & perruques</div>
        <div style={{ fontSize: 28, color: '#81747A', marginTop: 16 }}>Guédiawaye — Deux Boulangeries, Dakar</div>
      </div>
    ),
    size,
  );
}
