import { useState } from "react";
import { LogIn, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthDialog({ open, onClose }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const reset = () => {
    setEmail("");
    setPassword("");
    setConfirm("");
    setError(null);
  };

  const submit = async () => {
    if (!supabase) {
      setError("인증 서버에 연결할 수 없습니다");
      return;
    }
    if (!email.trim() || !password) return;
    if (mode === "signup") {
      if (password.length < 6) {
        setError("비밀번호는 6자 이상이어야 합니다");
        return;
      }
      if (password !== confirm) {
        setError("비밀번호 확인이 일치하지 않습니다");
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-[#6B7385] focus:outline-none focus:border-[#0066FF]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/60"
      onClick={onClose}
    >
      <div
        className="surface p-8 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {mode === "login" ? (
              <LogIn className="w-5 h-5 text-[#0066FF]" />
            ) : (
              <UserPlus className="w-5 h-5 text-[#0066FF]" />
            )}
            <h2 className="text-white font-bold text-xl tracking-tight">
              {mode === "login" ? "로그인" : "회원가입"}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#C5CAD3] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[#C5CAD3] text-xs mb-5">
          로그인하면 자동매매 설정이 계정별로 저장됩니다.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-white/[0.04]">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`py-2 rounded-lg text-sm font-semibold ${
                mode === m ? "btn-primary" : "text-[#C5CAD3]"
              }`}
            >
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="이메일"
            autoComplete="email"
            autoFocus
            className={inputCls}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="비밀번호 (6자 이상)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={inputCls}
          />
          {mode === "signup" && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              className={inputCls}
            />
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="btn-primary w-full font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? "확인 중..." : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
