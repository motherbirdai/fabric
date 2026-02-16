'use client';

import { useState } from 'react';
import { Wallet, Plus, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { api, Budget } from '@/lib/api';
import { useQuery, useMutation } from '@/lib/hooks';

function UtilBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = Math.min(100, (spent / limit) * 100);
  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#eab308' : '#068cff';
  return (
    <div className="w-full bg-fabric-gray-100 rounded-full h-3">
      <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const pct = budget.limitUsd > 0 ? (budget.spentUsd / budget.limitUsd) * 100 : 0;
  const isNearLimit = pct > 80;

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isNearLimit ? (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <h3 className="text-sm font-semibold">{budget.label || budget.periodType}</h3>
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
          budget.hardCap ? 'bg-red-50 text-red-600' : 'bg-fabric-gray-100 text-fabric-gray-500'
        }`}>
          {budget.hardCap ? 'Hard cap' : 'Soft limit'}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[12px] mb-1">
          <span className="text-fabric-gray-500">${budget.spentUsd.toFixed(2)} spent</span>
          <span className="font-medium">${budget.limitUsd.toFixed(2)} limit</span>
        </div>
        <UtilBar spent={budget.spentUsd} limit={budget.limitUsd} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] mt-3">
        <div>
          <span className="text-fabric-gray-500">Period: </span>
          <span className="font-medium">{budget.periodType}</span>
        </div>
        <div>
          <span className="text-fabric-gray-500">Resets: </span>
          <span className="font-medium">{budget.resetAt}</span>
        </div>
        {budget.agentId && (
          <div className="col-span-2">
            <span className="text-fabric-gray-500">Agent: </span>
            <code className="text-[10px] font-mono bg-fabric-gray-100 px-1 rounded">{budget.agentId}</code>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const budgets = useQuery(() => api.getBudgets());
  const sub = useQuery(() => api.getSubscription());
  const [showCreate, setShowCreate] = useState(false);
  const [newBudget, setNewBudget] = useState({ limitUsd: '', periodType: 'daily', hardCap: true });

  const createBudget = useMutation(async (input: typeof newBudget) => {
    await api.setBudget({
      limitUsd: parseFloat(input.limitUsd),
      periodType: input.periodType,
      hardCap: input.hardCap,
    });
    budgets.refetch();
    setShowCreate(false);
    setNewBudget({ limitUsd: '', periodType: 'daily', hardCap: true });
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Budget Controls</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-1">Set spending limits to control agent costs</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Budget
        </button>
      </div>

      {/* Daily usage summary */}
      {sub.data && (
        <div className="metric-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-fabric-blue" />
            <h2 className="text-sm font-semibold">Daily Request Usage</h2>
          </div>
          <div className="flex justify-between text-[12px] mb-1">
            <span className="text-fabric-gray-500">{sub.data.usedToday.toLocaleString()} requests used</span>
            <span className="font-medium">{sub.data.dailyLimit.toLocaleString()} daily limit ({sub.data.plan})</span>
          </div>
          <UtilBar spent={sub.data.usedToday} limit={sub.data.dailyLimit} />
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="metric-card mb-6 max-w-lg">
          <h2 className="text-sm font-semibold mb-4">New Budget</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-fabric-gray-500 mb-1">Limit (USD)</label>
              <input
                type="number"
                step="0.01"
                value={newBudget.limitUsd}
                onChange={(e) => setNewBudget({ ...newBudget, limitUsd: e.target.value })}
                placeholder="5.00"
                className="w-full px-3 py-2 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-fabric-blue"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] text-fabric-gray-500 mb-1">Period</label>
              <select
                value={newBudget.periodType}
                onChange={(e) => setNewBudget({ ...newBudget, periodType: e.target.value })}
                className="w-full px-3 py-2 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-fabric-blue"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newBudget.hardCap}
                onChange={(e) => setNewBudget({ ...newBudget, hardCap: e.target.checked })}
                className="w-4 h-4 accent-fabric-blue"
              />
              <span className="text-[12px]">Hard cap (block requests when exceeded)</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => createBudget.execute(newBudget)}
                disabled={!newBudget.limitUsd || createBudget.loading}
                className="px-4 py-2 bg-fabric-blue text-white text-[12px] font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
              >
                {createBudget.loading ? 'Creating...' : 'Create Budget'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 border border-fabric-gray-200 rounded-lg text-[12px] hover:bg-fabric-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {budgets.loading ? (
        <div className="text-center py-12 text-[13px] text-fabric-gray-400">Loading budgets...</div>
      ) : budgets.data?.budgets.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.data.budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Wallet className="w-8 h-8 text-fabric-gray-300 mx-auto mb-3" />
          <div className="text-[13px] text-fabric-gray-500">No budgets configured yet</div>
          <p className="text-[11px] text-fabric-gray-400 mt-1">Create a budget to control agent spending</p>
        </div>
      )}
    </div>
  );
}
