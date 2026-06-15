import React, { useState } from 'react';

interface ComparisonMetric {
  id: string;
  name: string;
  unit: string;
  weights: Record<string, number>;
}

interface DesignComparisonProps {
  designs: any[];
}

const DesignComparison: React.FC<DesignComparisonProps> = ({ designs }) => {
  const [selectedDesigns] = useState<string[]>([]);

  const metrics: ComparisonMetric[] = [
    { id: 'score', name: 'Overall Score', unit: '%', weights: { score: 1 } },
    { id: 'costEstimate', name: 'Total Cost', unit: '$', weights: { costEstimate: 1 } },
    { id: 'structuralRating', name: 'Structural Rating', unit: '%', weights: { structuralRating: 1 } },
    { id: 'constructionTime', name: 'Est. Duration', unit: 'days', weights: { constructionTime: 1 } },
  ];


  const selectedDesignData = designs.filter(d => selectedDesigns.includes(d.id));

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Design Comparison</h3>
        <span className="text-sm text-gray-500">{selectedDesigns.length} designs selected</span>
      </div>

      {selectedDesignData.length >= 2 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-gray-600">Metric</th>
                {selectedDesignData.map(design => (
                  <th key={design.id} className="text-center py-3 px-4">
                    <div className="font-medium">{design.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <tr key={metric.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">{metric.name}</td>
                  {selectedDesignData.map(design => (
                    <td key={`${design.id}-${metric.id}`} className="text-center py-3 px-4">
                      <div className="font-semibold">
                        {metric.id === 'costEstimate' 
                          ? `$${design[metric.id].toLocaleString()}`
                          : `${design[metric.id]}${metric.unit}`
                        }
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 grid grid-cols-3 gap-4">
            {selectedDesignData.map(design => (
              <div key={design.id} className="border rounded-lg p-4">
                <div className="font-medium mb-2">{design.name}</div>
                <div className="h-32 flex items-end gap-1">
                  <div className="flex-1 bg-blue-500 rounded-t" style={{ height: `${design.score}%` }} />
                </div>
                <div className="text-center text-xs text-gray-500 mt-1">Overall Score</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">Select at least 2 designs to compare</p>
      )}
    </div>
  );
};

export default DesignComparison;