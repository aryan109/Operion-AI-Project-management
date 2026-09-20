"use client";

import { useState } from "react";
import { Key, Plus, Trash2, CheckCircle2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

interface ApiKeysClientProps {
  initialKeys: any[];
  orgId?: string;
}

export function ApiKeysClient({ initialKeys, orgId }: ApiKeysClientProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [keyName, setKeyName] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setIssuedKey(data.apiKey);
        setKeys((prev) => [data, ...prev]);
        setKeyName("");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to generate key", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  const copyToClipboard = () => {
    if (issuedKey) {
      navigator.clipboard.writeText(issuedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" />
          API Keys for External Agents
        </h2>
      </div>

      {/* Newly issued key alert */}
      {issuedKey && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            API Key Generated (Save this key now — it will not be displayed again):
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={issuedKey}
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 text-xs font-mono text-emerald-300 border border-emerald-500/30"
            />
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          required
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          placeholder="New Key Name (e.g., 'Cursor Agent Key', 'Production CI')"
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Generate Key
        </button>
      </form>

      {/* List Keys */}
      <div className="divide-y divide-slate-800/80 pt-2">
        {keys.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No API keys issued yet.</p>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white">{k.name}</p>
                <p className="text-[10px] text-slate-400">
                  {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "Never used"}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Revoke key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
