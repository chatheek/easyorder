import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

const DynamicManifest = () => {
  const { whatsapp } = useParams();
  const location = useLocation();

  useEffect(() => {
    const isAdminRoute = location.pathname.includes('/admin');

    if (!isAdminRoute) {
      const existingLink = document.querySelector('link[rel="manifest"]');
      if (existingLink) existingLink.remove();
      return;
    }

    const origin = window.location.origin; // https://easyorder-weld.vercel.app
    const startUrl = `${origin}/${whatsapp}/admin`;
    const appName = `Admin Portal - ${whatsapp}`;

    const myManifest = {
      id: startUrl, 
      name: appName,
      short_name: "EO Admin",
      start_url: startUrl, // MUST BE ABSOLUTE
      display: 'standalone',
      theme_color: '#0f172a',
      background_color: '#f8fafc',
      icons: [
        { 
          src: `${origin}/pwa-192x192.png`, // MUST BE ABSOLUTE
          sizes: '192x192', 
          type: 'image/png' 
        },
        { 
          src: `${origin}/pwa-512x512.png`, // MUST BE ABSOLUTE
          sizes: '512x512', 
          type: 'image/png', 
          purpose: 'any' 
        }
      ]
    };

    const manifestURL = URL.createObjectURL(new Blob([JSON.stringify(myManifest)], { type: 'application/json' }));
    let link = document.querySelector('link[rel="manifest"]');
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = manifestURL;

    return () => URL.revokeObjectURL(manifestURL);
  }, [whatsapp, location.pathname]);

  return null;
};

export default DynamicManifest;