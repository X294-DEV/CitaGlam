import type { PublicTenantDto } from "@cgbg/shared-types";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Solo acepta #RRGGBB: el color llega del negocio y se escribe dentro de un <style>. */
function safeColor(value: string | null | undefined, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value : fallback;
}

export default function ThemeInjector({ tenant }: { tenant: PublicTenantDto }) {
  const config = tenant.config;
  const primary = safeColor(config?.primaryColor, "#2D4A47");
  const secondary = safeColor(config?.secondaryColor, "#C89F83");

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root {
            --primary-color: ${primary};
            --secondary-color: ${secondary};
            --background-soft: #f8f3ee;
          }
        `,
      }}
    />
  );
}
