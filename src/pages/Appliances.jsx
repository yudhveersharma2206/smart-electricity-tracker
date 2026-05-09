import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Trash2, Plus, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Appliances = () => {
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [powerWatts, setPowerWatts] = useState('');
  const [usageHours, setUsageHours] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAppliances = async () => {
    try {
      const res = await api.get('/appliances');
      setAppliances(res.data);
    } catch (err) {
      toast.error('Failed to load appliances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppliances();
  }, []);

  const filteredAppliances = appliances.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/appliances', {
        name,
        powerWatts: parseFloat(powerWatts),
        usageHours: parseFloat(usageHours),
      });
      toast.success('Appliance added');
      setName('');
      setPowerWatts('');
      setUsageHours('');
      fetchAppliances();
    } catch (err) {
      toast.error('Failed to add appliance');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/appliances/${id}`);
      toast.success('Appliance removed');
      fetchAppliances();
    } catch (err) {
      toast.error('Failed to remove appliance');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appliance Management</h1>
          <p className="text-slate-500">Track and manage your devices</p>
        </div>
        <div className="w-64">
          <input
            type="text"
            placeholder="Search appliances..."
            className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="text-brand-primary" size={20} /> Add New Appliance
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="e.g. Air Conditioner"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Power (Watts)</label>
            <input
              type="number"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="e.g. 1500"
              value={powerWatts}
              onChange={(e) => setPowerWatts(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Hrs/Day</label>
            <input
              type="number"
              step="0.1"
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="e.g. 8"
              value={usageHours}
              onChange={(e) => setUsageHours(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-brand-primary text-white font-medium py-2 rounded-lg hover:bg-brand-secondary transition-colors"
            >
              Add Device
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {filteredAppliances.map((app) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-brand-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary/10 rounded-lg text-brand-primary">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{app.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Zap size={14} /> {app.powerWatts}W
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {app.usageHours}h/day
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-medium">Daily Cost</p>
                  <p className="font-bold text-slate-900">
                    ${((app.powerWatts * app.usageHours / 1000) * 0.15).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(app.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {!loading && appliances.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400">No appliances added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appliances;
