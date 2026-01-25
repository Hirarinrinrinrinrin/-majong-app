# デプロイ完了までの残り作業手順

現在、アプリケーションの基本セットアップは完了し、ドメイン（jyotomahjongclub.com）の設定がインターネット全体に行き渡るのを待っている状態です。
チャット終了後も、この手順書に従えば作業を完了できます。

## 1. 待機（DNSの浸透）
お名前.comの設定変更が反映されるまで待ちます。
早ければ数十分ですが、最大で24時間程度かかる場合もあります。

**確認方法:**
ブラウザで [http://jyotomahjongclub.com](http://jyotomahjongclub.com) にアクセスします。
*   ❌ 「お名前.com」の画面が出る → まだ待つ必要があります。
*   ✅ **麻雀アプリの画面が表示される** → 次のステップへ進んでください。

## 2. SSL（https）化の実行
アプリ画面が表示されたら、通信を暗号化してログインできるようにします。

1.  **ConoHaのコンソール（黒い画面）を開く**
    *   ログインユーザー: `root`
2.  **以下のコマンドを実行**
    ```bash
    certbot --nginx -d jyotomahjongclub.com
    ```
    *   メールアドレスを聞かれたら入力してEnter
    *   規約の同意 (`Terms of Service`) → `Y` を入力してEnter
    *   ニュースメールの登録 → `N` でOK

3.  **「Congratulations!」と表示されれば成功です。**

## 3. 最終動作確認
ブラウザで [https://jyotomahjongclub.com](https://jyotomahjongclub.com) にアクセス出来るようになります（鍵マークがつきます）。

以下の初期アカウントでログインできるか確認してください。

*   **一般ユーザー:** `user` / `user`
*   **管理者:** `admin` / `admin`

## (参考) 困ったときのコマンド

**サーバーの状態確認**
```bash
pm2 status
```

**アプリの再起動**
```bash
pm2 restart majong
```

**ログの確認（エラーが出た時など）**
```bash
pm2 logs majong --lines 50
```
