import "@/app/globals.css";
import { StoreProvider } from "@/lib/store";

export const viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1.0,
};

export const metadata = {
  title: "NEORESPONSE — Media Buying Financial OS",
  description: "O sistema operacional de decisão financeira e performance real para tráfego pago (media buying).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
