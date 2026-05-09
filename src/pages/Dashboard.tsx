import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Appliance } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Zap, DollarSign, Activity, Sparkles, Download, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

const Dashboard = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/appliances');
      setAppliances(res.data);
    } catch (err) {
      toast.error('Failed to load usage data');
    }
  };

  const stats = useMemo(() => {
    if (!Array.isArray(appliances)) return { dailyKwh: '0.00', monthlyKwh: '0.00', estimatedBill: '0.00', highestConsumer: 'N/A' };
    const dailyKwh = appliances.reduce((acc, curr) => acc + (curr.powerWatts * curr.usageHours / 1000), 0);
    const monthlyKwh = dailyKwh * 30;
    const rate = 0.15; // Example rate per kWh
    
    // Sort to find highest consumer
    const sorted = [...appliances].sort((a, b) => (b.powerWatts * b.usageHours) - (a.powerWatts * a.usageHours));
    
    return {
      dailyKwh: dailyKwh.toFixed(2),
      monthlyKwh: monthlyKwh.toFixed(2),
      estimatedBill: (monthlyKwh * rate).toFixed(2),
      highestConsumer: sorted[0]?.name || 'N/A'
    };
  }, [appliances]);

  const chartData = useMemo(() => {
    if (!Array.isArray(appliances)) return [];
    return appliances.map(app => ({
      name: app.name,
      consumption: parseFloat((app.powerWatts * app.usageHours / 1000).toFixed(2))
    })).sort((a, b) => b.consumption - a.consumption);
  }, [appliances]);

  const handleGetAISuggestions = async () => {
    if (!Array.isArray(appliances) || appliances.length === 0) {
      toast.error('Add some appliances first!');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const res = await api.post('/ai/suggestions', { appliances });
      setAiSuggestions(res.data.suggestions || 'No suggestions found.');
    } catch (err) {
      console.error(err);
      toast.error('AI Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportPDF = () => {
    // @ts-ignore
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Electricity Usage Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    
    const tableData = appliances.map(a => [
      a.name, 
      `${a.powerWatts}W`, 
      `${a.usageHours}h`, 
      `${(a.powerWatts * a.usageHours / 1000).toFixed(2)} kWh`
    ]);

    // @ts-ignore
    doc.autoTable({
      head: [['Appliance', 'Power', 'Daily Usage', 'Daily Consumption']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Daily Consumption: ${stats.dailyKwh} kWh`, 20, finalY);
    doc.text(`Estimated Monthly Bill: $${stats.estimatedBill}`, 20, finalY + 10);

    doc.save('energy-usage-report.pdf');
    toast.success('Report downloaded');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 text-brand-primary">Dashboard</h1>
          <p className="text-slate-500">Real-time energy analytics</p>
        </div>
        <button 
          onClick={exportPDF}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download size={18} /> Export Report
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Zap />} 
          label="Daily Usage" 
          value={`${stats.dailyKwh} kWh`} 
          color="bg-amber-100 text-amber-600" 
        />
        <StatCard 
          icon={<DollarSign />} 
          label="Est. Monthly Bill" 
          value={`$${stats.estimatedBill}`} 
          color="bg-emerald-100 text-emerald-600" 
        />
        <StatCard 
          icon={<Activity />} 
          label="Active Devices" 
          value={appliances.length.toString()} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          icon={<TrendingUp />} 
          label="Major Consumer" 
          value={stats.highestConsumer} 
          color="bg-rose-100 text-rose-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart View */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 text-brand-secondary">Daily Consumption Breakdown</h2>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">kWh per day</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-sm">
                          <p className="font-bold">{payload[0].payload.name}</p>
                          <p className="opacity-80">{payload[0].value} kWh/day</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="consumption" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Section */}
        <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary opacity-20 blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 text-brand-primary mb-2">
              <Sparkles size={24} />
              <span className="font-bold uppercase tracking-wider text-sm">AI Insights</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">Energy Optimizer</h2>
            <p className="text-slate-400 text-sm mb-6">
              Get personalized AI suggestions based on your appliance usage patterns to save on your next bill.
            </p>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[200px] mb-6 overflow-y-auto max-h-[300px]">
              {aiSuggestions ? (
                <div className="prose prose-invert prose-sm">
                  {aiSuggestions.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 italic">
                   <Activity className="opacity-20 mb-2" size={48} />
                   Click "Optimize Now" to start analysis
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleGetAISuggestions}
            disabled={isAnalyzing}
            className="relative z-10 w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-primary/40 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Activity size={20} />
                </motion.div>
                Analyzing Usage...
              </>
            ) : (
              <>
                Optimize Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4"
  >
    <div className={`p-4 rounded-xl ${color}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </motion.div>
);

export default Dashboard;
