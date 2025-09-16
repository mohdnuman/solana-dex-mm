import cors from 'cors';
import path from 'path';
import express from 'express';

import ConfigProvider from "../config/config.provider";

// export function initialiseUIServer(configProvider: any) {
//     const app = express();
//     const PORT = 3000;
//
//     app.use(cors());
//     app.use(express.json());
//     app.use(express.static(path.join(__dirname)));
//
//     app.get('/', (req, res) => {
//         return res.sendFile(path.join(__dirname, 'index.html'));
//     });
//
//     app.get('/api/config', (req, res) => {
//         try {
//             const config = configProvider.getConfig();
//             const editableConfig = {
//                 bias: config.bias,
//                 tradesPerCycle: config.tradesPerCycle,
//                 volumePerMinute: config.volumePerMinute
//             };
//             return res.status(200).json(editableConfig);
//         } catch (error) {
//             return res.status(500).json({error: 'Failed to load configuration'});
//         }
//     });
//
//     app.post('/api/config', (req, res) => {
//         try {
//             const allowedFields = ['bias', 'tradesPerCycle', 'volumePerMinute'];
//             const updateData: any = {};
//
//             for (const field of allowedFields) {
//                 if (req.body[field] !== undefined) {
//                     updateData[field] = req.body[field];
//                 }
//             }
//
//             configProvider.updateConfig(updateData);
//             return res.json({success: true, message: 'Configuration updated successfully'});
//         } catch (error) {
//             return res.status(500).json({error: 'Failed to update configuration'});
//         }
//     });
//
//     app.listen(PORT, () => {
//         console.log(`Config UI Server running at http://localhost:${PORT}`);
//     });
//
//     return app;
// }

export default class UiServer{
    constructor(configProvider: ConfigProvider) {
        const app = express();
        const PORT = 3000;

        app.use(cors());
        app.use(express.json());
        app.use(express.static(path.join(__dirname)));

        app.get('/', (req, res) => {
            return res.sendFile(path.join(__dirname, 'index.html'));
        });

        app.get('/api/config', (req, res) => {
            try {
                const config = configProvider.getConfig();
                const editableConfig = {
                    bias: config.bias,
                    tradesPerCycle: config.tradesPerCycle,
                    volumePerMinute: config.volumePerMinute
                };
                return res.status(200).json(editableConfig);
            } catch (error) {
                return res.status(500).json({error: 'Failed to load configuration'});
            }
        });

        app.post('/api/config', (req, res) => {
            try {
                const allowedFields = ['bias', 'tradesPerCycle', 'volumePerMinute'];
                const updateData: any = {};

                for (const field of allowedFields) {
                    if (req.body[field] !== undefined) {
                        updateData[field] = req.body[field];
                    }
                }

                configProvider.updateConfig(updateData);
                return res.json({success: true, message: 'Configuration updated successfully'});
            } catch (error) {
                return res.status(500).json({error: 'Failed to update configuration'});
            }
        });

        app.get('/api/wallets', (req, res) => {
            try {
                const config = configProvider.getConfig();
                const wallets = config.wallets || [];
                return res.status(200).json(wallets);
            } catch (error) {
                return res.status(500).json({error: 'Failed to load wallets'});
            }
        });

        app.listen(PORT, () => {
            console.log(`Config UI Server running at http://localhost:${PORT}`);
        });
    }
}
