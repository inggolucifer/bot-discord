const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', 'utf8');

const newHandler = `
  const handleStopWorkSelf = async () => {
      try {
          setActionLoading(true);
          const res = await api.post('/worker/stop-mandiri');
          alert(res.data.message);

          const assetsRes = await api.get('/player/assets');
          setAssets(assetsRes.data.data);

          if (selectedAsset) {
              const updatedSelected = assetsRes.data.data.find((a: any) => a.id === selectedAsset.id);
              if (updatedSelected) setSelectedAsset(updatedSelected);
          }
      } catch (err: unknown) {
          console.error(err);
          alert((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Gagal berhenti bekerja.');
      } finally {
          setActionLoading(false);
      }
  };
`;

code = code.replace(/const handleWorkSelf = async \(\) => {/, newHandler + '\n\n  const handleWorkSelf = async () => {');

const buttonsUI = `
                                  {selectedAsset.assignedWorkers.some(w => w.workerId === user?.id) ? (
                                      <button onClick={handleStopWorkSelf} disabled={actionLoading} className="w-full bg-orange-900/80 hover:bg-orange-800 disabled:bg-gray-800 disabled:text-gray-500 text-orange-100 text-sm py-2 rounded transition-colors font-bold flex items-center justify-center gap-2 mb-2">
                                          <Pickaxe size={16} /> Berhenti Kerja Mandiri
                                      </button>
                                  ) : (
                                      <button onClick={handleWorkSelf} disabled={actionLoading || (!selectedAsset.underConstruction && selectedAsset.assignedWorkers.length >= 1)} className="w-full bg-[#8b0000]/80 hover:bg-[#8b0000] disabled:bg-gray-800 disabled:text-gray-500 text-red-100 text-sm py-2 rounded transition-colors font-bold flex items-center justify-center gap-2 mb-2">
                                          <Pickaxe size={16} /> Kerja Mandiri di Aset Ini
                                      </button>
                                  )}
`;

code = code.replace(/<button onClick=\{handleWorkSelf\}[\s\S]*?<\/button>/, buttonsUI);
fs.writeFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', code);
