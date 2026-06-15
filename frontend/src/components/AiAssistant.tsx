import React, { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Rule {
  keywords: string[]
  title: string
  response: string
}

const RULES: Rule[] = [
  {
    keywords: ['retaining wall', 'embedment', 'overturning', 'sliding ratio', 'as 4678'],
    title: 'Retaining Walls',
    response: `**Retaining Walls — AS 4678-2002**

Key design requirements:
- **Embedment depth** ≥ 30% of exposed wall height (§4.3)
- **Drainage layer** mandatory behind all retaining walls (§5.2)
- **Overturning ratio** ≥ 1.5 (§6.2) and **sliding ratio** ≥ 1.5 (§6.3)
- **Surcharge** minimum 5 kPa residential (§3.4)
- Walls > 1.5 m require CPEng sign-off (§1.2)

Quick example: 2.0 m wall → embedment ≥ 0.6 m, must have drainage.`,
  },
  {
    keywords: ['strip foundation', 'footing', 'bearing capacity', 'as 2870', 'footing width'],
    title: 'Strip Foundations',
    response: `**Strip Foundations — AS 2870-2011**

Key requirements:
- **Minimum width** ≥ 3× wall thickness (§4.3)
- **Minimum depth** ≥ 300 mm (§4.4); NZ cold regions: 450 mm (NZS 3604 §6.2)
- **Bearing stress** must not exceed soil bearing capacity (§5.2)
- Check soil classification (Class A/M/H/E/P) — drives reactive soil design

For loaded walls, calculate actual bearing pressure: q = P/B where P = load (kN/m), B = footing width (m).`,
  },
  {
    keywords: ['concrete', 'mpa', 'strength', 'slump', 'cover', 'reinforcement'],
    title: 'Concrete Specification',
    response: `**Concrete — NZS 3109 / AS 1379**

Common mixes for NZ infrastructure:
| Mix     | Use case                         | Min cover |
|---------|----------------------------------|-----------|
| 20 MPa  | Blinding, non-structural fill    | 40 mm     |
| 25 MPa  | General structural / walls       | 40 mm     |
| 30 MPa  | High durability / coastal        | 50 mm     |
| 40 MPa  | Precast, post-tensioned          | 30 mm     |

- Slump: 80–120 mm typical for pumped concrete
- Water-cement ratio ≤ 0.5 for durability
- Curing: minimum 7 days moist curing (NZS 3109 §10)`,
  },
  {
    keywords: ['steel', 'rebar', 'reinforcement', 'yield', '500e', 'ductility'],
    title: 'Reinforcing Steel',
    response: `**Reinforcing Steel — AS/NZS 4671**

Standard NZ grades:
- **Grade 500E** — 500 MPa yield, Class E (high ductility) — required for seismic zones
- **Grade 300E** — 300 MPa yield, lower strength but more ductile
- Bar sizes: D10, D12, D16, D20, D25, D32, D40

Lap lengths (Grade 500E, 25 MPa concrete):
- Tension lap: 40–55× bar diameter
- Compression lap: 30× bar diameter

Always specify **Class E** (high ductility) for NZ seismic applications.`,
  },
  {
    keywords: ['drainage', 'stormwater', 'pipe', 'slope', 'as 3500', 'culvert'],
    title: 'Drainage & Stormwater',
    response: `**Stormwater Drainage — AS/NZS 3500.3**

Self-cleansing slope (minimum):
- DN100: 1.0%  |  DN150: 0.67%  |  DN225: 0.44%
- DN300: 0.33% |  DN375: 0.27%  |  DN450: 0.22%
- Formula: min slope % ≈ 100 / diameter_mm

Cover depths (AS/NZS 3500.3 §10.2):
- Minimum 450 mm under trafficked areas
- Minimum 300 mm in non-trafficked areas

Design storm: typically 10-year ARI for minor drainage, 100-year for major.`,
  },
  {
    keywords: ['cost', 'estimate', 'budget', 'rate', 'nzd', 'price', 'tender'],
    title: 'NZ Construction Rates',
    response: `**Typical NZ Civil Construction Rates (mid-2026)**

Materials:
- Concrete 25 MPa: ~$345/m³
- Rebar 16 mm: ~$3.20/kg
- Aggregate GAP20: ~$42/t

Labour:
- Civil foreman: ~$95/hr
- Plant operator: ~$75/hr
- Labourer: ~$48/hr
- Concrete finisher: ~$72/hr

Plant:
- 20t excavator: ~$185/hr
- 6t dumper: ~$95/hr

Standard markup: overhead 12% + profit 10% + contingency 5%.`,
  },
  {
    keywords: ['carbon', 'emission', 'co2', 'scope', 'greenhouse', 'ghg', 'sustainability'],
    title: 'Carbon & Emissions',
    response: `**Carbon Accounting in Construction**

NZ emission factors (mid-2026):
- Diesel: 2.68 kgCO₂e/L
- Petrol: 2.31 kgCO₂e/L
- NZ grid electricity: 0.091 kgCO₂e/kWh (high renewables)
- Concrete (OPC): ~300 kgCO₂e/m³
- Steel (rebar): ~1.8 kgCO₂e/kg
- Road freight: ~0.12 kgCO₂e/tonne·km

NZ construction benchmark: ~100 t CO₂e per $1M contract.

Use the **Carbon Dashboard** module to track Scope 1/2/3 emissions.`,
  },
  {
    keywords: ['seismic', 'earthquake', 'nzs 1170', 'hazard', 'ductility', 'loadings'],
    title: 'Seismic Design',
    response: `**Seismic Design — NZS 1170.5**

NZ seismic hazard zones:
- Wellington: highest hazard (Z = 0.4)
- Auckland: moderate (Z = 0.1–0.15)
- Christchurch: high (Z = 0.3)

Ductility demand (μ):
- μ = 1.0 — Fully elastic (nominally ductile)
- μ = 3.0 — Ductile structures (standard frame)
- μ = 6.0 — Fully ductile

Use **Grade 500E** reinforcing for seismic applications.
Capacity design principles apply to all Importance Level 3+ structures.`,
  },
  {
    keywords: ['gantt', 'schedule', 'critical path', 'cpm', 'programme', 'milestone'],
    title: 'Project Scheduling',
    response: `**CPM Scheduling Tips**

Critical Path Method identifies the longest dependency chain — this drives your project end date.

Key terms:
- **Float / slack**: time an activity can slip without delaying the project
- **Early start / late start**: window for scheduling each task
- **Lag**: deliberate delay between predecessor and successor
- **Lead**: overlap between tasks

Best practices for civil projects:
1. Break earthworks, concrete, and services into separate work packages
2. Allow 10–15% buffer on concrete cure activities
3. Include owner-supplied equipment lead times as activities
4. Review critical path weekly during construction

Use the **CPM Scheduler** module to build and track your programme.`,
  },
  {
    keywords: ['procurement', 'rfq', 'supplier', 'tender', 'purchase order', 'po'],
    title: 'Procurement',
    response: `**Procurement Process**

Typical civil procurement workflow:
1. **Scope definition** — bill of quantities + specs
2. **Market sounding** — identify 3–5 qualified suppliers
3. **RFQ / RFT** — issue request for quote / tender
4. **Evaluation** — price, quality, programme, H&S record
5. **Award** — issue purchase order or contract
6. **Delivery management** — track against schedule

NZ-specific considerations:
- Check suppliers are NZ-registered for GST (15%)
- Require H&S pre-qualification for site-delivered materials
- Concrete: specify mix design + delivery docket requirements upfront

Use the **Procurement** module to manage your POs.`,
  },
]

const FALLBACK = `I can help with civil and infrastructure engineering topics. Try asking about:

• **Retaining walls** — AS 4678 embedment, drainage, stability ratios
• **Strip foundations** — AS 2870 bearing capacity, depth requirements
• **Concrete** — mix design, cover, strength grades
• **Reinforcing steel** — AS/NZS 4671 Grade 500E, ductility
• **Drainage** — AS/NZS 3500.3 self-cleansing slopes, culverts
• **Cost estimation** — NZ unit rates, markups
• **Carbon** — Scope 1/2/3 emission factors
• **Seismic design** — NZS 1170.5 hazard zones
• **Scheduling** — CPM critical path concepts
• **Procurement** — RFQ, PO workflow`

function findResponse(text: string): string {
  const lower = text.toLowerCase()
  const rule = RULES.find(r => r.keywords.some(kw => lower.includes(kw)))
  return rule ? rule.response : FALLBACK
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-gray-900">{line.slice(2, -2)}</p>
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.slice(2)
          const html = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: html }} />
        }
        if (line.startsWith('| ')) {
          return null
        }
        if (line.startsWith('#')) {
          const level = line.match(/^#+/)?.[0].length ?? 1
          const content = line.replace(/^#+\s*/, '')
          if (level <= 2) return <p key={i} className="font-bold text-gray-900 mt-2">{content}</p>
          return <p key={i} className="font-semibold text-gray-700">{content}</p>
        }
        const html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        return line.trim() ? <p key={i} dangerouslySetInnerHTML={{ __html: html }} /> : <div key={i} className="h-1" />
      })}
    </div>
  )
}

const QUICK_QUESTIONS = [
  'Retaining wall embedment requirements?',
  'What are NZ concrete strength grades?',
  'How do I calculate self-cleansing slope?',
  'Typical NZ labour rates?',
  'Carbon emission factors for concrete?',
]

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: FALLBACK,
    },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q) return
    const userMsg: Message = { role: 'user', content: q }
    const answer = findResponse(q)
    const assistantMsg: Message = { role: 'assistant', content: answer }
    setMessages(m => [...m, userMsg, assistantMsg])
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="border-b bg-white px-6 py-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-800">AI Engineering Assistant</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Rule-based knowledge engine — AS/NZS standards, NZ rates, design guidance
        </p>
      </div>

      {/* Quick questions */}
      <div className="flex gap-2 overflow-x-auto px-6 py-3 bg-white border-b shrink-0">
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => send(q)}
            className="whitespace-nowrap text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mr-2 mt-0.5">
                AI
              </div>
            )}
            <div className={`max-w-2xl rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'
            }`}>
              {m.role === 'user' ? (
                <p className="text-sm">{m.content}</p>
              ) : (
                <MarkdownText text={m.content} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t bg-white px-6 py-4">
        <div className="flex gap-3 items-end">
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about retaining walls, concrete, drainage, scheduling, costs..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => send()}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-5 py-2.5 font-medium text-sm transition-colors"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Press Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}

export default AiAssistant
