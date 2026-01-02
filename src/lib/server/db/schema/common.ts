import { customType } from 'drizzle-orm/sqlite-core';

export const json = <T>(name: string) =>
    customType<{
        data: T;
        driverData: string;
    }>({
        dataType() { return 'json'; },
        toDriver: (value: T) => JSON.stringify(value),
        fromDriver: (value: string) => JSON.parse(value),
    })(name);
