const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-dashboard/src/app/market/page.tsx', 'utf8');
code = code.replace(/} catch {/g, "} catch (err: unknown) {");
code = code.replace(/"Terjadi kesalahan pada jaringan atau server" \|\| 'Gagal membeli\.'/g, "(err as any)?.response?.data?.error || 'Gagal membeli.'");
code = code.replace(/"Terjadi kesalahan pada jaringan atau server" \|\| 'Gagal menjual item\.'/g, "(err as any)?.response?.data?.error || 'Gagal menjual item.'");
code = code.replace(/} catch \(err\) {/g, "} catch (err: unknown) {");
fs.writeFileSync('jianghu-bot/web-dashboard/src/app/market/page.tsx', code);
