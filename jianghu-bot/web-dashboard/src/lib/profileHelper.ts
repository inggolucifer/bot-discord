export function getPlayerFromProfileResponse(resData: any) {
    if (!resData) return null;
    return resData.data ?? resData;
}
