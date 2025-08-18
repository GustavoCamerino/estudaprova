import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = async (action: string, page: string, metadata?: any) => {
    try {
      if (!user) return;

      await supabase
        .from('page_analytics')
        .insert({
          user_id: user.id,
          action,
          page,
          metadata: metadata || {},
          ip_address: '', // Would need to get from server
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const trackPageView = (page: string) => {
    trackEvent('page_view', page);
  };

  const trackClick = (element: string, page: string) => {
    trackEvent('click', page, { element });
  };

  const trackUpload = (fileType: string, page: string) => {
    trackEvent('upload', page, { fileType });
  };

  const trackDownload = (fileName: string, page: string) => {
    trackEvent('download', page, { fileName });
  };

  return {
    trackEvent,
    trackPageView,
    trackClick,
    trackUpload,
    trackDownload
  };
};