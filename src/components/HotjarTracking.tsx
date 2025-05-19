import { useEffect } from 'react';

const HotjarTracking = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (function(h: any, o: any, t: any, j: any, a: any, r: any){
      h.hj = h.hj || function(){(h.hj.q = h.hj.q || []).push(arguments)};
      h._hjSettings = {hjid:6408029, hjsv:6};
      a = o.getElementsByTagName('head')[0];
      r = o.createElement('script'); r.async = 1;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=', undefined, undefined);

  }, []);

  return null; // Ce composant ne rend rien dans le DOM
};

export default HotjarTracking;
