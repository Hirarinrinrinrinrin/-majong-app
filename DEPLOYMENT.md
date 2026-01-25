# 麻雀スコア管理アプリ - VPSデプロイ手順書

このドキュメントは、さくらのVPSなどのLinuxサーバー（Ubuntu/CentOSなど）に本アプリケーションをデプロイするための手順書です。

## 前提条件
*   VPSサーバーが契約済みであること（OSは Ubuntu 22.04 LTS 推奨）
*   TeraTermやPowerShellなどでサーバーにSSH接続ができること

## 手順 1: サーバーの準備 (Node.jsのインストール)

サーバーに接続し、以下のコマンドを実行してNode.jsをインストールします。
（Ubuntuの場合の例）

```bash
# パッケージリストの更新
sudo apt update
sudo apt upgrade -y

# Node.js (v20系) のセットアップ
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# インストール確認 (バージョンが表示されればOK)
node -v
npm -v
```

## 手順 2: アプリケーションの配置

一番簡単な「GitHub経由」の方法を記載します。
※GitHubを使わない場合は、WinSCPなどのソフトでフォルダごとアップロードしてください。

```bash
# gitのインストール
sudo apt install -y git

# リポジトリのクローン (URLは適宜変更)
git clone <あなたのリポジトリURL> majong-app

# フォルダへ移動
cd majong-app
```

## 手順 3: 依存ライブラリのインストールとビルド

Linux環境用にライブラリを入れ直し、本番用にビルドします。

```bash
# ライブラリのインストール
npm install

# 本番用ビルド
npm run build
```

## 手順 4: アプリケーションの起動と常駐化 (PM2)

画面を閉じてもアプリが動き続けるように `pm2` というツールを使います。

```bash
# pm2のインストール
sudo npm install -g pm2

# アプリの起動
pm2 start npm --name "majong" -- run start

# 起動確認
pm2 list

# (オプション) サーバー再起動時も自動で立ち上がるようにする
pm2 save
pm2 startup
```

## 手順 5: ファイアウォールの設定

ポート3000へのアクセスを許可します。

```bash
sudo ufw allow 3000
sudo ufw allow ssh
sudo ufw enable
```

## 完了

ブラウザで `http://<サーバーのIPアドレス>:3000` にアクセスし、アプリが表示されれば完了です！
majong.dbはサーバー上に保存され、消えることはありません。
