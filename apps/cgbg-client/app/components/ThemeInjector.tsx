export default function ThemeInjector({ tenant }: { tenant: any }) {
  const config = tenant?.config || {};
  const primary = config.primaryColor || "#2D4A47";
  const secondary = config.secondaryColor || "#C89F83";

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
