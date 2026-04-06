import React from "react"
import SentimentGauge from "./SentimentGauge"
import AssetOverviewPanel from "./AssetOverviewPanel"

export const AnalyticsDashboard: React.FC = () => (
  <div className="p-8 bg-gray-100 min-h-screen">
    <h1 className="text-4xl font-bold mb-6">Analytics Dashboard</h1>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SentimentGauge symbol="SOL" />
      <AssetOverviewPanel assetId="SOL-001" />
      <div className="p-4 bg-white rounded shadow flex items-center justify-center">
        <span className="text-gray-600">Whale tracker widget placeholder</span>
      </div>
    </div>
  </div>
)

export default AnalyticsDashboard
