import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/getQueryClient';
import { cookies } from 'next/headers';
import CultivationClient from './CultivationClient';
import api from '@/lib/api';

export default async function CultivationPage() {
    const queryClient = getQueryClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        await queryClient.prefetchQuery({
            queryKey: ['cultivation'],
            queryFn: async () => {
                const { data } = await api.get('/cultivation', {
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
            <CultivationClient />
        </HydrationBoundary>
    );
}
