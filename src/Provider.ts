import { workspace, TreeDataProvider, EventEmitter, Event, window } from 'vscode';
import fundApi from './api';
import { FundInfo } from './index';
import FundItem from './TreeItem';

export default class DataProvider implements TreeDataProvider<FundInfo> {
    private refreshEvent: EventEmitter<FundInfo | null> = new EventEmitter<FundInfo | null>();
    readonly onDidChangeTreeData: Event<FundInfo | null> = this.refreshEvent
        .event;

    private order: number;

    constructor() {
        this.order = -1;
    }

    refresh() {
        // 更新视图
        setTimeout(() => {
            this.refreshEvent.fire(null);
        }, 200);
    }

    getTreeItem(info: FundInfo): FundItem {
        return new FundItem(info);
    }

    getChildren(): Promise<FundInfo[]> {
        const { order } = this;
        // 获取配置的基金代码
        const favorites: string[] = workspace
            .getConfiguration()
            .get('fund.favorites', []);

        // 获取基金数据
        return fundApi([...favorites]).then((results: FundInfo[]) =>
            results.sort(
                (prev, next) =>
                    (prev.changeRate >= next.changeRate ? 1 : -1) * order
            )
        );
    }

    updateConfig(funds: string[]) {
        const config = workspace.getConfiguration();
        const favorites = Array.from(
            // 通过 Set 去重
            new Set([...config.get('fund.favorites', []), ...funds])
        );
        config.update('fund.favorites', favorites, true);
    }

    async addFund() {
        // 弹出输入框
        const res = await window.showInputBox({
            value: '',
            valueSelection: [5, -1],
            prompt: '添加基金到自选',
            placeHolder: 'Add Fund To Favorite',
            validateInput: (inputCode: string) => {
                const codeArray = inputCode.split(/[\W]/);
                const hasError = codeArray.some((code) => {
                    return code !== '' && !/^\d+$/.test(code);
                });
                return hasError ? '基金代码输入有误' : null;
            },
        });
        if (!!res) {
            const codeArray = res.split(/[\W]/) || [];
            const result = await fundApi([...codeArray]);
            if (result && result.length > 0) {
                // 只更新能正常请求的代码
                const codes = result.map((i) => i.code);
                this.updateConfig(codes);
                this.refresh();
            } else {
                window.showWarningMessage('stocks not found');
            }
        }
    }

      // 删除配置
  removeConfig(code: string) {
    const config = workspace.getConfiguration();
    const favorites: string[] = [...config.get('fund.favorites', [])];
    const index = favorites.indexOf(code);
    if (index === -1) {
      return;
    }
    favorites.splice(index, 1);
    config.update('fund.favorites', favorites, true);
  }

}
