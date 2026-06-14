"use client";

import { useState } from "react";
import {
  UserPlus,
  Send,
  MessageCircle,
  Calendar,
  BarChart2,
  Mail,
  Inbox,
  Star,
  AlertTriangle,
  Phone,
  Clock,
  DollarSign,
} from "lucide-react";

type Tab = "overview" | "messaging" | "deliverability" | "dialer" | "credits";

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  extra,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="bg-gray-100 rounded-lg p-2 inline-flex">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 mt-3">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {extra}
    </div>
  );
}

function EmptyChart({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <BarChart2 className="h-16 w-16 text-gray-200 mb-4" />
      <p className="text-sm font-medium text-gray-500">{title || "No chart data"}</p>
      <p className="text-xs text-gray-400 mt-1">
        {description || "Data will appear here once you start your campaigns."}
      </p>
    </div>
  );
}

function OverviewTab() {
  const [chartToggle, setChartToggle] = useState("new_leads");
  const chartOptions = [
    { key: "new_leads", label: "New leads contacted" },
    { key: "messages", label: "Messages sent" },
    { key: "all_responses", label: "All responses" },
    { key: "positive", label: "Positive responses" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={UserPlus} title="Leads contacted" value="0" subtitle="No change" />
        <StatCard icon={Send} title="Messages sent" value="0" subtitle="No change" />
        <StatCard icon={MessageCircle} title="Responses" value="0" subtitle="No change" />
        <StatCard icon={Calendar} title="Meetings booked" value="0" subtitle="No change" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">New leads contacted over time</h3>
        <div className="flex gap-2 mb-4">
          {chartOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setChartToggle(opt.key)}
              className={
                chartToggle === opt.key
                  ? "bg-violet-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
                  : "bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <EmptyChart />
      </div>
    </div>
  );
}

function MessagingTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Mail} title="Emails sent" value="0" subtitle="No change" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Emails sent over time</h3>
        <EmptyChart />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Top conversation drivers</h3>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600">
            <option>Reply rate</option>
          </select>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No conversation drivers yet</p>
          <p className="text-xs text-gray-400 mt-1">Data will appear once campaigns generate replies.</p>
        </div>
      </div>
    </div>
  );
}

function DeliverabilityTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Send} title="Emails sent" value="0" subtitle="No change" />
        <StatCard icon={Inbox} title="Inbox placement rate" value="0%" subtitle="No change" />
        <StatCard icon={Star} title="Reply rate" value="0%" subtitle="No change" />
        <StatCard icon={AlertTriangle} title="Bounce rate" value="0%" subtitle="No change" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery status over time</h3>
        <EmptyChart />
      </div>
    </div>
  );
}

function DialerTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Phone} title="Calls made" value="0" subtitle="No change" />
        <StatCard icon={Phone} title="Calls connected" value="0" subtitle="0 (0% connection rate)" />
        <StatCard
          icon={Phone}
          title="Avg. call duration"
          value="0m 0s"
          extra={<p className="text-xs text-green-600">+0.0% vs. previous</p>}
        />
        <StatCard
          icon={BarChart2}
          title="Connected outcome distribution"
          value="0% positive response rate"
          extra={
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                <span className="text-green-600">0 positive</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />
                <span className="text-yellow-600">0 neutral</span>
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                <span className="text-red-600">0 negative</span>
              </span>
            </div>
          }
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Call trends</h3>
        <EmptyChart />
      </div>
    </div>
  );
}

function CreditsTab() {
  const [breakdownToggle, setBreakdownToggle] = useState<"campaign" | "action">("campaign");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={BarChart2}
          title="Credits used"
          value="0"
          subtitle="Credits used in selected period"
          extra={<p className="text-xs text-green-600">+0.0% vs. previous</p>}
        />
        <StatCard
          icon={DollarSign}
          title="Current balance"
          value="10,000"
          subtitle="Available credits"
          extra={<p className="text-xs text-gray-400">Next credit grant: +0 credit</p>}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Credits used over time</h3>
        <EmptyChart />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Usage breakdown</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setBreakdownToggle("campaign")}
                className={
                  breakdownToggle === "campaign"
                    ? "bg-violet-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
                    : "bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                }
              >
                By campaign
              </button>
              <button
                onClick={() => setBreakdownToggle("action")}
                className={
                  breakdownToggle === "action"
                    ? "bg-violet-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
                    : "bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                }
              >
                By action type
              </button>
            </div>
            <button className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Export
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No usage breakdown yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Usage breakdown will appear once you start using credits.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Transaction history</h3>
          <button className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Export CSV
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2 pr-4">Invoice</th>
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2 pr-4">Status</th>
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2 pr-4">Amount</th>
              <th className="text-xs text-gray-500 uppercase font-medium text-left py-2">Created</th>
            </tr>
          </thead>
          <tbody />
        </table>
        <div className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">No transactions yet</p>
        </div>
      </div>
    </div>
  );
}

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "messaging", label: "Messaging" },
  { key: "deliverability", label: "Deliverability" },
  { key: "dialer", label: "Dialer" },
  { key: "credits", label: "Credits" },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [dateRange, setDateRange] = useState("30");
  const [viewBy, setViewBy] = useState("daily");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
          <select
            value={viewBy}
            onChange={(e) => setViewBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? "px-4 py-3 text-sm font-medium border-b-2 border-violet-600 text-violet-700"
                  : "px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "messaging" && <MessagingTab />}
      {activeTab === "deliverability" && <DeliverabilityTab />}
      {activeTab === "dialer" && <DialerTab />}
      {activeTab === "credits" && <CreditsTab />}
    </div>
  );
}
