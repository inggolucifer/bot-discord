import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/getQueryClient';
import { cookies } from 'next/headers';
import ArenaClient from './ArenaClient';
import api from '@/lib/api';

export default async function ArenaPage() {
    const queryClient = getQueryClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        await queryClient.prefetchQuery({
            queryKey: ['arenaOpponents'],
            queryFn: async () => {
                const { data } = await api.get('/battle/opponents', {
                    headers: {
                        Cookie: `accessToken=${token}`
                    }
                });
                return data;
            }
        });
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ArenaClient />
        </HydrationBoundary>
    );
}
