/**
 * Style Breakdown Component
 * Donut chart showing artist's style distribution
 */

'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';

interface StyleProfile {
  style_name: string;
  percentage: number;
  image_count: number;
}

interface StyleBreakdownProps {
  artistId?: string;
}

const STYLE_DISPLAY_NAMES: Record<string, string> = {
  'traditional': 'Traditional',
  'neo-traditional': 'Neo-Traditional',
  'fine-line': 'Fine Line',
  'blackwork': 'Blackwork',
  'geometric': 'Geometric',
  'realism': 'Realism',
  'japanese': 'Japanese',
  'watercolor': 'Watercolor',
  'dotwork': 'Dotwork',
  'tribal': 'Tribal',
  'illustrative': 'Illustrative',
  'surrealism': 'Surrealism',
  'minimalist': 'Minimalist',
  'lettering': 'Lettering',
  'new-school': 'New School',
  'trash-polka': 'Trash Polka',
  'black-and-gray': 'Black & Gray',
  'biomechanical': 'Biomechanical',
  'ornamental': 'Ornamental',
  'sketch': 'Sketch',
};

// Muted color palette matching the design system
const COLORS = [
  '#1A1A1A', // ink (primary)
  '#8B7355', // warm brown
  '#6B8E6B', // sage green
  '#8B8985', // gray
  '#A0522D', // sienna
  '#4A5568', // slate
  '#8B6914', // olive gold
  '#6B5B73', // dusty purple
];

export default function StyleBreakdown({ artistId }: StyleBreakdownProps) {
  const [styles, setStyles] = useState<StyleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStyles() {
      try {
        console.log('[StyleBreakdown] Fetching styles for artist:', artistId);
        const response = await fetch(`/api/artist/${artistId}/styles`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('[StyleBreakdown] API error:', response.status, errData);
          throw new Error(errData.error || 'Failed to fetch styles');
        }
        const data = await response.json();
        console.log('[StyleBreakdown] Got styles:', data);
        setStyles(data.styles || []);
      } catch (err) {
        console.error('Failed to fetch style breakdown:', err);
        setError('Unable to load style data');
      } finally {
        setLoading(false);
      }
    }

    if (artistId) {
      fetchStyles();
    }
  }, [artistId]);

  if (loading) {
    return (
      <div className="border border-gray-300 bg-white p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || styles.length === 0) {
    return (
      <div className="border border-gray-300 bg-white p-6">
        <h3 className="font-heading text-sm mb-4">Your Style</h3>
        <div className="text-center py-6 text-gray-500">
          <p className="font-body text-sm">
            {error || 'No style data available yet'}
          </p>
        </div>
      </div>
    );
  }

  // Take top 8 styles
  const topStyles = styles.slice(0, 8);

  const chartData = topStyles.map((s) => ({
    name: STYLE_DISPLAY_NAMES[s.style_name] || s.style_name,
    value: Math.round(s.percentage),
    images: s.image_count,
  }));

  return (
    <div className="border border-gray-300 bg-white h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex justify-between items-baseline">
        <h3 className="font-heading text-base">Your Style</h3>
        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
          Based on {styles.reduce((sum, s) => sum + s.image_count, 0)} images
        </p>
      </div>

      {/* Chart + Legend */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Donut Chart */}
          <div className="w-40 h-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value}%`,
                    String(name),
                  ]}
                  contentStyle={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    border: '1px solid #D8D6D2',
                    borderRadius: '4px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {chartData.map((style, index) => (
                <div key={style.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-body text-sm truncate">
                    {style.name}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500">
                    {style.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
