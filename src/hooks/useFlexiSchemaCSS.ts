import { useEffect } from "react";

export function useFlexiSchemaCSS() {
  useEffect(() => {
    const faId = "flexischema-crm-fa";
    if (!document.getElementById(faId)) {
      const link = document.createElement("link");
      link.id   = faId;
      link.rel  = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
      document.head.appendChild(link);
    }
  }, []);
}
