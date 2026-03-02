import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function WhatsAppFloatingButton() {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "whatsapp_number")
        .maybeSingle();
      if (data?.value) setNumber(data.value);
    };
    fetch();
  }, []);

  if (!number) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`https://wa.me/${number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-transform hover:scale-110"
            style={{ backgroundColor: "#25D366" }}
          >
            <svg viewBox="0 0 32 32" className="h-7 w-7" fill="white">
              <path d="M16.004 2.002c-7.732 0-14.002 6.27-14.002 14.002 0 2.468.656 4.878 1.902 6.988L2 30l7.188-1.884A13.94 13.94 0 0 0 16.004 30c7.732 0 14.002-6.27 14.002-14.002-.004-7.728-6.274-13.996-14.002-13.996zm0 25.614a11.59 11.59 0 0 1-5.912-1.62l-.424-.252-4.396 1.152 1.174-4.286-.276-.44a11.58 11.58 0 0 1-1.778-6.168c0-6.408 5.216-11.62 11.62-11.62 6.4 0 11.614 5.212 11.614 11.62-.004 6.408-5.22 11.614-11.622 11.614zm6.37-8.7c-.348-.176-2.064-1.02-2.384-1.136-.32-.116-.552-.176-.784.176s-.9 1.136-1.104 1.37c-.204.232-.404.264-.752.088-.348-.176-1.472-.542-2.804-1.728-1.036-.924-1.736-2.064-1.94-2.412-.204-.348-.02-.536.152-.71.156-.156.348-.408.524-.612.176-.204.232-.348.348-.58.116-.232.06-.436-.028-.612-.088-.176-.784-1.892-1.076-2.592-.284-.68-.572-.588-.784-.598l-.668-.012c-.232 0-.608.088-.924.436-.32.348-1.212 1.184-1.212 2.888s1.24 3.352 1.412 3.584c.176.232 2.444 3.732 5.924 5.236.828.356 1.472.57 1.976.728.832.264 1.588.228 2.184.14.668-.1 2.064-.844 2.352-1.66.292-.816.292-1.516.204-1.66-.084-.148-.316-.232-.664-.408z" />
            </svg>
          </a>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Falar com a W3</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
