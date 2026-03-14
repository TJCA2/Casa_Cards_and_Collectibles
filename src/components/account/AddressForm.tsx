"use client";

import { useState } from "react";

const US_STATES = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
] as const;

export interface AddressFormValues {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export const EMPTY_ADDRESS: AddressFormValues = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  isDefault: false,
};

interface Props {
  initial?: AddressFormValues;
  onSave: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

type Errors = Partial<Record<keyof AddressFormValues, string>>;

function validate(v: AddressFormValues): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Full name is required";
  if (!v.line1.trim()) e.line1 = "Address is required";
  if (!v.city.trim()) e.city = "City is required";
  if (!v.state) e.state = "State is required";
  if (!v.zip.trim()) e.zip = "ZIP code is required";
  else if (!/^\d{5}$/.test(v.zip)) e.zip = "ZIP must be 5 digits";
  return e;
}

export default function AddressForm({
  initial = EMPTY_ADDRESS,
  onSave,
  onCancel,
  submitLabel = "Save Address",
}: Props) {
  const [values, setValues] = useState<AddressFormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  function field(key: keyof AddressFormValues) {
    return {
      value: values[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setApiError("");
    try {
      await onSave(values);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.name ? "border-red-400" : "border-gray-200"}`}
          {...field("name")}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Address line 1 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          autoComplete="address-line1"
          placeholder="123 Main St"
          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.line1 ? "border-red-400" : "border-gray-200"}`}
          {...field("line1")}
        />
        {errors.line1 && <p className="mt-1 text-xs text-red-600">{errors.line1}</p>}
      </div>

      {/* Address line 2 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Apartment, suite, etc. <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          autoComplete="address-line2"
          placeholder="Apt 4B"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none"
          {...field("line2")}
        />
      </div>

      {/* City / State / ZIP */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoComplete="address-level2"
            placeholder="New York"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.city ? "border-red-400" : "border-gray-200"}`}
            {...field("city")}
          />
          {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            State <span className="text-red-500">*</span>
          </label>
          <select
            autoComplete="address-level1"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.state ? "border-red-400" : "border-gray-200"}`}
            value={values.state}
            onChange={(e) => setValues((v) => ({ ...v, state: e.target.value }))}
          >
            <option value="">—</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {code} — {name}
              </option>
            ))}
          </select>
          {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            ZIP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoComplete="postal-code"
            placeholder="10001"
            maxLength={5}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none ${errors.zip ? "border-red-400" : "border-gray-200"}`}
            {...field("zip")}
          />
          {errors.zip && <p className="mt-1 text-xs text-red-600">{errors.zip}</p>}
        </div>
      </div>

      {/* Country (readonly) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
        <input
          readOnly
          value="United States"
          className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
        />
      </div>

      {/* Set as default */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(e) => setValues((v) => ({ ...v, isDefault: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 accent-red-600"
        />
        <span className="text-sm text-gray-700">Set as default shipping address</span>
      </label>

      {apiError && <p className="text-sm text-red-600">{apiError}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
