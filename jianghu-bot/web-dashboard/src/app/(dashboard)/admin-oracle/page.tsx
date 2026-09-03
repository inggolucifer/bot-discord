import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/getQueryClient';
import { cookies } from 'next/headers';
import OracleClient from './OracleClient';
import api from '@/lib/api';

export default async function AdminOraclePage() {
    const queryClient = getQueryClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        await queryClient.prefetchQuery({
            queryKey: ['adminOracle'],
            queryFn: async () => {
                try {
                    const { data } = await api.get('/admin/oracle', {
                        headers: {
                            Cookie: `accessToken=${token}`
                        }
                    });
                    return data.data;
                } catch (e) {
                    return null;
                }
            }
        });
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OracleClient />
        </HydrationBoundary>
    );
}
