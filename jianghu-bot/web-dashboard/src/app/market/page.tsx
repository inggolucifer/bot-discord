import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/getQueryClient';
import { cookies } from 'next/headers';
import MarketClient from './MarketClient';
import api from '@/lib/api';

export default async function MarketPage() {
    const queryClient = getQueryClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: ['market_shop'],
                queryFn: async () => {
                    const { data } = await api.get('/market/shop', { headers: { Cookie: `accessToken=${token}` } });
                    return data;
                }
            }),
            queryClient.prefetchQuery({
                queryKey: ['market_auctions'],
                queryFn: async () => {
                    const { data } = await api.get('/market/auctions', { headers: { Cookie: `accessToken=${token}` } });
                    return data;
                }
            }),
            queryClient.prefetchQuery({
                queryKey: ['market_listings'],
                queryFn: async () => {
                    const { data } = await api.get('/market/player-shop', { headers: { Cookie: `accessToken=${token}` } });
                    return data;
                }
            })
        ]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <MarketClient />
        </HydrationBoundary>
    );
}
