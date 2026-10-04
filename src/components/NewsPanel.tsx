import { Newspaper, ExternalLink } from "lucide-react";
import type { NewsItem } from "@/types";
import { formatTimeAgo } from "@/lib/format";

interface Props {
  news: NewsItem[];
  loading: boolean;
  onRefresh: () => void;
}

function sentimentColor(score: number): string {
  if (score >= 0.2) return "#22c55e";
  if (score <= -0.2) return "#ef4444";
  return "#8a8f9b";
}

function sentimentBg(score: number): string {
  if (score >= 0.2) return "rgba(34, 197, 94, 0.12)";
  if (score <= -0.2) return "rgba(239, 68, 68, 0.12)";
  return "rgba(138, 143, 155, 0.12)";
}

export default function NewsPanel({ news, loading, onRefresh }: Props) {
  return (
    <div className="surface flex flex-col h-full">
      <div className="flex items-center justify-between p-7 border-b border-white/[0.12]">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[#0066FF]" />
          <h2 className="text-white font-semibold text-lg tracking-tight">오늘의 미국 증시 뉴스</h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary text-sm font-medium px-3 py-1.5 rounded-xl disabled:opacity-50"
        >
          {loading ? "로딩..." : "새로고침"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05] max-h-[600px]">
        {loading && news.length === 0 ? (
          <div className="p-8 text-center text-[#C5CAD3] text-sm">
            뉴스를 불러오는 중...
          </div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center text-[#C5CAD3] text-sm">
            뉴스가 없습니다.
          </div>
        ) : (
          news.map((item) => {
            const color = sentimentColor(item.sentimentScore);
            const bg = sentimentBg(item.sentimentScore);
            return (
              <a
                key={item.uuid}
                href={item.link || `https://www.google.com/search?q=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-5 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-snug mb-1.5 line-clamp-2 group-hover:text-[#3388FF] transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#C5CAD3]">
                      <span className="font-medium">{item.publisher}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(item.providerPublishTime)}</span>
                      {item.relatedTickers && item.relatedTickers.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#3388FF] font-semibold">
                            {item.relatedTickers.slice(0, 3).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#C5CAD3] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: bg }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-bold" style={{ color }}>
                      {item.sentimentLabel}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.abs(item.sentimentScore) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color }}
                    >
                      {item.sentimentScore > 0 ? "+" : ""}
                      {item.sentimentScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
