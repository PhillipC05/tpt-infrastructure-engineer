import React, { useState } from 'react';

interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  parameters: DesignParameter[];
}

interface DesignParameter {
  id: string;
  name: string;
  type: 'number' | 'select' | 'boolean';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  unit?: string;
}

interface GeneratedDesign {
  id: string;
  name: string;
  score: number;
  parameters: Record<string, any>;
  costEstimate: number;
  structuralRating: number;
  complianceStatus: 'pass' | 'warning' | 'fail';
}

const DesignGenerator: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const templates: DesignTemplate[] = [
    {
      id: 'retaining_wall',
      name: 'Retaining Wall',
      category: 'Structural',
      parameters: [
        { id: 'height', name: 'Wall Height', type: 'number', value: 3.0, min: 0.5, max: 12, step: 0.1, unit: 'm' },
        { id: 'length', name: 'Wall Length', type: 'number', value: 20, min: 1, max: 200, step: 1, unit: 'm' },
        { id: 'material', name: 'Construction Material', type: 'select', value: 'concrete', options: ['concrete', 'timber', 'gabion', 'sheet_pile'] },
        { id: 'soil_type', name: 'Backfill Material', type: 'select', value: 'granular', options: ['granular', 'clay', 'silt', 'rock'] },
        { id: 'water_table', name: 'High Water Table', type: 'boolean', value: false },
      ]
    },
    {
      id: 'foundations',
      name: 'Strip Foundation',
      category: 'Foundations',
      parameters: [
        { id: 'width', name: 'Foundation Width', type: 'number', value: 0.6, min: 0.3, max: 3, step: 0.05, unit: 'm' },
        { id: 'depth', name: 'Foundation Depth', type: 'number', value: 0.8, min: 0.3, max: 5, step: 0.1, unit: 'm' },
        { id: 'load', name: 'Applied Load', type: 'number', value: 150, min: 10, max: 500, step: 10, unit: 'kN/m' },
      ]
    },
    {
      id: 'culvert',
      name: 'Box Culvert',
      category: 'Drainage',
      parameters: [
        { id: 'span', name: 'Clear Span', type: 'number', value: 2.4, min: 0.6, max: 6, step: 0.1, unit: 'm' },
        { id: 'height', name: 'Internal Height', type: 'number', value: 1.8, min: 0.6, max: 4, step: 0.1, unit: 'm' },
        { id: 'cover', name: 'Fill Cover', type: 'number', value: 1.0, min: 0.3, max: 10, step: 0.1, unit: 'm' },
      ]
    }
  ];

  const activeTemplate = templates.find(t => t.id === selectedTemplate);

  const generateAlternatives = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const designs: GeneratedDesign[] = [];
    for (let i = 0; i < 3; i++) {
      designs.push({
        id: `design_${i}`,
        name: `Alternative ${String.fromCharCode(65 + i)}`,
        score: 75 + Math.random() * 20,
        parameters: { ...parameters },
        costEstimate: Math.round(12000 + Math.random() * 8000),
        structuralRating: Math.round(60 + Math.random() * 35),
        complianceStatus: ['pass', 'warning', 'pass'][i] as any
      });
    }
    
    setGeneratedDesigns(designs);
    setIsGenerating(false);
  };

  const updateParameter = (paramId: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramId]: value }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Design Generator</h2>

        <div className="grid grid-cols-12 gap-6">
          {/* Template Selection */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-4">Design Templates</h3>
              <div className="space-y-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      const defaults: Record<string, any> = {};
                      template.parameters.forEach(p => defaults[p.id] = p.value);
                      setParameters(defaults);
                      setGeneratedDesigns([]);
                    }}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters Panel */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-4">Design Parameters</h3>
              
              {activeTemplate ? (
                <div className="space-y-4">
                  {activeTemplate.parameters.map(param => (
                    <div key={param.id}>
                      <label className="text-sm text-gray-600 block mb-1">
                        {param.name} {param.unit && <span className="text-gray-400">({param.unit})</span>}
                      </label>
                      
                      {param.type === 'number' && (
                        <input
                          type="number"
                          value={parameters[param.id] ?? param.value}
                          onChange={(e) => updateParameter(param.id, Number(e.target.value))}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        />
                      )}
                      
                      {param.type === 'select' && (
                        <select
                          value={parameters[param.id] ?? param.value}
                          onChange={(e) => updateParameter(param.id, e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                          {param.options?.map(opt => (
                            <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                          ))}
                        </select>
                      )}
                      
                      {param.type === 'boolean' && (
                        <button
                          onClick={() => updateParameter(param.id, !parameters[param.id])}
                          className={`px-4 py-2 rounded ${
                            parameters[param.id] ? 'bg-green-600 text-white' : 'bg-gray-200'
                          }`}
                        >
                          {parameters[param.id] ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={generateAlternatives}
                    disabled={isGenerating}
                    className="w-full mt-4 bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Generating Alternatives...
                      </span>
                    ) : 'Generate Design Alternatives'}
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Select a design template to begin</p>
              )}
            </div>
          </div>

          {/* Generated Designs */}
          <div className="col-span-5">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-4">Generated Designs</h3>
              
              {generatedDesigns.length > 0 ? (
                <div className="space-y-4">
                  {generatedDesigns.map(design => (
                    <div key={design.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">{design.name}</div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          design.complianceStatus === 'pass' ? 'bg-green-100 text-green-700' :
                          design.complianceStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {design.complianceStatus.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Overall Score</div>
                          <div className="font-semibold text-lg">{Math.round(design.score)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Cost Estimate</div>
                          <div className="font-semibold">${design.costEstimate.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Structural</div>
                          <div className="font-semibold">{design.structuralRating}%</div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button className="flex-1 text-sm py-1.5 bg-gray-100 rounded hover:bg-gray-200">View</button>
                        <button className="flex-1 text-sm py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Select</button>
                        <button className="flex-1 text-sm py-1.5 border rounded hover:bg-gray-50">Compare</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No designs generated yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignGenerator;