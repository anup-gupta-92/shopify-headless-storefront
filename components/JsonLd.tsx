import { serializeJsonLd, type JsonLdObject } from "@/lib/structured-data";

interface JsonLdProps {
  data: JsonLdObject;
  id: string;
}

export default function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
