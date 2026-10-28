import { saveBrandAction, saveCommerceAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AArea, ACheck, ASelect, AText, Panel } from "@/components/admin/inputs";
import { Badge } from "@/components/ui/primitives";
import { getEnv } from "@/lib/config/env";
import { loadContent } from "@/lib/data/content";
import { paiseToDecimalString } from "@/lib/money";

export const metadata = { title: "Store settings" };

export default async function AdminSettings() {
  const { content } = await loadContent();
  const env = getEnv();
  const { brand, commerce } = content;
  const status = (ok: boolean, label: string) => (
    <li className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-ink">{label}</span>
      <Badge tone={ok ? "success" : "warning"}>{ok ? "Configured" : "Missing"}</Badge>
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-2 text-h2 text-ink">Store settings</h1>
      </div>

      <Panel title="Brand & contact" description="Used everywhere on the site, in structured data and by the assistant.">
        <AdminForm action={saveBrandAction}>
          <div className="grid gap-4 md:grid-cols-2">
            <AText label="Brand name" name="name" defaultValue={brand.name} required />
            <AText label="Tagline" name="tagline" defaultValue={brand.tagline} required />
            <AText label="Email" name="email" type="email" defaultValue={brand.email} required />
            <AText label="Phone (display)" name="phoneDisplay" defaultValue={brand.phoneDisplay} required />
            <AText label="Phone (E.164)" name="phoneE164" defaultValue={brand.phoneE164} required hint="e.g. +918879379724" />
            <AText label="Instagram URL" name="instagramUrl" defaultValue={brand.instagramUrl} required />
            <AText label="Instagram handle" name="instagramHandle" defaultValue={brand.instagramHandle} required />
          </div>
          <AText
            label="Postal address (optional)"
            name="address"
            defaultValue={brand.address ?? ""}
            hint="Shown in the footer, on the contact page and in the chatbot's brand knowledge."
          />
          <AArea label="Short description" name="shortDescription" defaultValue={brand.shortDescription} rows={2} required maxLength={400} />
        </AdminForm>
      </Panel>

      <Panel
        title="Checkout & delivery rules"
        description="Leave a field empty while it is unconfirmed — checkout stays in contact-to-purchase mode until shipping and serviceable PIN codes are set."
      >
        <AdminForm action={saveCommerceAction}>
          <div className="grid gap-4 md:grid-cols-2">
            <AText label="Shipping fee (₹)" name="shippingFee" defaultValue={commerce.shippingFeePaise === null ? "" : paiseToDecimalString(commerce.shippingFeePaise)} hint="0 for free shipping; empty = not configured." />
            <AText
              label="Free shipping from (₹)"
              name="freeShippingThreshold"
              defaultValue={commerce.freeShippingThresholdPaise === null ? "" : paiseToDecimalString(commerce.freeShippingThresholdPaise)}
              hint="Optional."
            />
            <AText label="Delivery estimate" name="deliveryEstimate" defaultValue={commerce.deliveryEstimate} hint="Only an approved estimate, e.g. “5–7 business days”." />
            <AText label="Max quantity per item" name="maxQuantityPerLine" type="number" defaultValue={commerce.maxQuantityPerLine} />
            <ASelect
              label="Listed prices include GST?"
              name="pricesIncludeTax"
              defaultValue={commerce.pricesIncludeTax === null ? "unknown" : commerce.pricesIncludeTax ? "yes" : "no"}
              options={[
                { value: "unknown", label: "Not confirmed" },
                { value: "yes", label: "Yes, inclusive" },
                { value: "no", label: "No, added at checkout" },
              ]}
            />
            <AText
              label="Serviceable PIN-code prefixes"
              name="serviceablePincodes"
              defaultValue={commerce.serviceablePincodePrefixes === null ? "" : commerce.serviceablePincodePrefixes.length === 0 ? "ALL" : commerce.serviceablePincodePrefixes.join(", ")}
              hint="Comma-separated prefixes (e.g. 40, 41), “ALL” for all of India, empty = not configured."
            />
          </div>
          <ACheck name="checkoutEnabled" defaultChecked={commerce.checkoutEnabled} label="Enable online checkout (also requires payment credentials and approved policies)" />
        </AdminForm>
      </Panel>

      <Panel title="Integration status" description="Credentials are read from server environment variables and are never displayed.">
        <ul className="divide-y divide-line">
          {status(env.razorpay.configured, "Razorpay API keys")}
          {status(env.razorpay.webhookConfigured, "Razorpay webhook secret")}
          {status(env.razorpay.livePaymentsFlag, "CHECKOUT_LIVE_PAYMENTS flag")}
          {status(env.supabase.configured, "Supabase database")}
          {status(env.nvidia.chatConfigured, "NVIDIA chat")}
          {status(env.nvidia.embeddingsConfigured, "NVIDIA embeddings")}
          {status(env.contact.configured, "Contact email delivery")}
        </ul>
      </Panel>
    </div>
  );
}
