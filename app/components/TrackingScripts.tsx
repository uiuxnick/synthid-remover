import Script from 'next/script';
import type { PublicTracking, ParsedScript } from '@/lib/tracking';

const inline = (id: string, code: string) => (
  <Script id={id} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: code }} />
);

function Custom({ list, prefix }: { list: ParsedScript[]; prefix: string }) {
  return (
    <>
      {list.map((s, i) =>
        s.src ? (
          <Script key={`${prefix}${i}`} id={`${prefix}${i}`} src={s.src} strategy="afterInteractive" />
        ) : (
          inline(`${prefix}${i}`, s.inline ?? '')
        )
      )}
    </>
  );
}

/** All IDs here were regex-validated (lib/tracking.ts), so interpolation into snippets is safe. */
export function TrackingScripts({ t }: { t: PublicTracking }) {
  return (
    <>
      {t.gtm && inline('gtm', `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${t.gtm}');`)}
      {t.ga4 && (
        <>
          <Script id="ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${t.ga4}`} strategy="afterInteractive" />
          {inline('ga4', `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${t.ga4}');`)}
        </>
      )}
      {t.pixel && inline('meta-pixel', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.pixel}');fbq('track','PageView');`)}
      {t.clarity && inline('clarity', `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${t.clarity}");`)}
      {t.plausible && <Script id="plausible" src="https://plausible.io/js/script.js" data-domain={t.plausible} strategy="afterInteractive" />}
      <Custom list={t.head} prefix="custom-head-" />
      <Custom list={t.body} prefix="custom-body-" />
    </>
  );
}
