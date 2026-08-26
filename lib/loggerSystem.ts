// Logger System for Dev Server
type Notify = 'warning' | 'error' | 'success' | 'update';
type Client = 'serverside' | 'clientside';

type Log = {
    id: string,
    notification: Notify,
    message: string,
    client: Client,
}

let messages:Log[] = [
    {
        id: 'platform-error',
        notification: 'update',
        message: 'A platform erorr has occured! Please check the console.',
        client: 'serverside',
    },
        {
        id: 'platform-error',
        notification: 'update',
        message: 'A platform erorr has occured! Please check the console.',
        client: 'serverside',
    },
        {
        id: 'platform-error',
        notification: 'update',
        message: 'A platform erorr has occured! Please check the console.',
        client: 'serverside',
    }
];