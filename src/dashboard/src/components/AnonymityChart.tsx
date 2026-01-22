import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AnonymityChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["anonymity-sets"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/anonymity-sets?limit=100`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Transform distribution data for chart
  const chartData =
    data?.distribution?.slice(0, 20).map((item: any) => ({
      size: item.size,
      count: item.count,
    })) || [];

  const hasData = chartData.length > 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          Anonymity Set Distribution
        </h3>
        <p className="text-sm text-slate-400">
          How many possible sources for each withdrawal
        </p>
      </div>

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <div className="text-slate-400 mb-2">
            No withdrawal data available
          </div>
          <div className="text-sm text-slate-500">
            This protocol has deposits but no withdrawals yet.
            <br />
            Anonymity set analysis requires withdrawal activity.
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="size"
                stroke="#94a3b8"
                label={{
                  value: "Anonymity Set Size",
                  position: "insideBottom",
                  offset: -5,
                  fill: "#94a3b8",
                }}
              />
              <YAxis
                stroke="#94a3b8"
                label={{
                  value: "Count",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#94a3b8",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "0.5rem",
                  color: "#e2e8f0",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Mean</div>
              <div className="text-white font-semibold">
                {data?.statistics?.mean?.toFixed(1) || 0}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Median</div>
              <div className="text-white font-semibold">
                {data?.statistics?.median || 0}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Max</div>
              <div className="text-white font-semibold">
                {data?.statistics?.max || 0}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
