# Hoyolab 自動デイリーチェックイン

本日のチェックイン状況:
[![If you see this text, chances are the automation hasn't run. Do your setup below!](../../actions/workflows/login.yml/badge.svg)](../../actions/workflows/login.yml)

リポジトリのバージョン:
[![Do your setup!](../../actions/workflows/version.yml/badge.svg)](../../actions/workflows/version.yml)

## 目次

- [Cookieの取得方法](#cookieの取得方法)
- [使い方](#使い方)
- [複数アカウント](#複数アカウント)
- [Discord Webhook](#discord-webhook)
- [よくある質問](#よくある質問)
  - [これは安全ですか？](#これは安全ですか)
  - [(フォークした)リポジトリのバージョンを更新するには？](#フォークしたリポジトリのバージョンを更新するには)
  - [「ログインしていません」エラー](#ログインしていませんエラー)
  - [その他の問題がある場合](#その他の問題がある場合)

## Cookieの取得方法

Cookieを取得するには、まず手動でチェックインする必要があります。以下の手順に従ってください(クリックしてスクリーンショットを開く):

1. [HoYoLAB](https://www.hoyolab.com/home) を開き、まだの場合はログインします (当然ですが)

2. <details>
   <summary>開発者ツールを開く (<kbd>Ctrl+Shift+I</kbd> または右クリック > 検証)</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/81a57cfa-9f2e-48d7-bec6-5ef4edc3b857" />
   </details>

3. <details>
   <summary>Chromium系ブラウザの場合、Applicationタブをクリックします。見つからない場合は矢印をクリックしてください。</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/ea4bb233-367c-4c41-8c66-30c2bc2f3150" />
   </details>
   <details>
   <summary>Firefox/Gecko系ブラウザの場合、Storageタブをクリックします。</summary>
   <img src="https://github.com/user-attachments/assets/4e12c315-9a01-4ad8-9e5f-6197328e900f" />
   </details>

4. <details>
   <summary>フィルターボックスに <code>v2</code> と入力します。見やすくするために開発者ツールを広げてもよいでしょう。</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/bf1eec5f-bb1e-4af2-b37b-3c3c252328db" />
   </details>

5. <details>
   <summary><code>ltoken_v2</code> と <code>ltuid_v2</code> を見つけてクリックし、下の値をコピーします。</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/3ce70d90-6d5d-4353-ab35-8476c44124a1" />
   </details>

6. <details open>
   <summary>スクリーンショットのように <code>ltuid_v2=PASTE_ltuid_v2; ltoken_v2=PASTE_ltoken_v2</code> の形式で書きます。</summary>

   分かりやすくするため、ブラウザのURLバー上でこの行を書いています。コロン(:)ではなくセミコロン(;)を使う点に注意してください。

   以下のようになります: `ltuid_v2=249806310; ltoken_v2=v2_CAISDG...`

   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/4309fcd9-3d6b-43f3-96f2-d8276bea6280" />
   </details>

7. それをコピーしてください。それがあなたのCookieです。大切に保管し、絶対に他人と共有しないでください！

### Endfield (SKPORT) 用のCookie取得方法

Endfieldの自動チェックインを設定する場合、必要なのは SKPORT の `SK_OAUTH_CRED_KEY` です。

hoyolabのCookieとは別の `SKPORT_COOKIE` というシークレットに設定します。これにより、将来SKPORT側の仕様変更があっても、hoyolabの `COOKIE` を再設定し直す必要がなくなります。

1. [Endfield サインインページ](https://game.skport.com/endfield/sign-in) を開き、ログインします。
2. 開発者ツールを開き (<kbd>F12</kbd> または検証)、ページをリロードします。
3. Applicationタブ -> Cookies -> `https://game.skport.com` (または `.skport.com`) を開きます。
4. 一覧から `SK_OAUTH_CRED_KEY` を見つけ、その値(Value)をコピーします。この値が `endfield` 用の `SKPORT_COOKIE` になります。大切に保管し、絶対に他人と共有しないでください。

複数アカウントで一部だけEndfieldを使う場合の行の並べ方は [複数アカウント](#複数アカウント) を参照してください。

> [!NOTE]
> SKPORT側の認証方式は今後も変更される可能性があります。うまく動作しない場合は、この手順を参考に最新の `SK_OAUTH_CRED_KEY` を取得し直してください。

## 使い方

1. [このリポジトリをフォーク](../../fork)
2. フォークしたリポジトリを開く
3. <details>
   <summary>Settings > Secrets and variables > Actions を開く</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/134a2c25-0345-4a46-b84f-5fa928031e5a" />
   </details>

4. <details>
   <summary>New repository secrets をクリック</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/9d77c1d2-60e5-4dd0-a5d4-3b81c1bf0321" />
   </details>

5. <details>
   <summary>
      名前に <code>COOKIE</code>、値に <a href="#cookieの取得方法">取得したCookie</a> を入力し、Add secret をクリック
   </summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/9a450ba4-a155-4a0e-8a48-d730a3be5c73" />
   </details>

5-1. Endfield (SKPORT) をチェックインする場合は、同様に `SKPORT_COOKIE` という名前のシークレットも作成し、[取得した `SK_OAUTH_CRED_KEY`](#endfield-skport-用のcookie取得方法) を値として設定してください。

6. <details>
   <summary>次にゲームの設定です。Variables に移動し、New repository variable をクリック</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/5c6c226a-141c-41c2-82f5-8254b1741196" />
   </details>

7. <details>
   <summary>
      名前に <code>GAMES</code>、値にチェックインしたいゲームコードをスペース区切りで入力します(スクリーンショット参照)。<br/>
      対応しているのは <code>zzz</code>, <code>gi</code>, <code>hsr</code>, <code>hi3</code>, <code>tot</code>, <code>endfield</code> です。
   </summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/01cd1a4b-16ae-4f3c-ba3e-cd3f913e44fa" />
   </details>

8. <details>
   <summary>
      初日は手動でトリガーする必要があります。
      <a href="../../actions/workflows/login.yml">こちら</a>を開き、Run workflow をクリックしてください。
   </summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/ea1e48d2-a069-4db6-bdcd-86eecae8d81d" />
   </details>

9. <details>
   <summary>ページを更新し、15〜25秒ほど待って、正常に実行されたか確認します。README上部にチェックイン状況が表示されるはずです。</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/5c8520ee-a8b7-4c66-bb1b-ef945c499112" />
   </details>

10. 設定完了です！翌日ゲームを起動して、報酬を受け取れているか確認しましょう

## 複数アカウント

<details>
  <summary>他のアカウントを追加するには、下記のようにCookieとGamesの新しい行を追加します。</summary>
  <img src="https://github.com/user-attachments/assets/99fd25cd-71f6-4aae-9949-11d055fadf73" />
  <img src="https://github.com/user-attachments/assets/4a56f4e1-8fb4-4137-acc6-ac30cade78f1" />
</details>

`COOKIE` と `GAMES` はいずれも改行区切りで、同じ行番号のアカウントとして扱われます。

`SKPORT_COOKIE` だけは扱いが異なります。GitHub Secretsは値の先頭・末尾の空行を保存時に取り除いてしまうため、行を空けて番号を揃えることができません。そのため `SKPORT_COOKIE` には **`GAMES` に `endfield` を含むアカウントの分だけ、出現する順番に** 値を並べてください(hoyolabのみのアカウントの分は行を空ける必要はありません)。

例えば `GAMES` が
```
gi hsr
endfield
zzz endfield
```
の場合、`SKPORT_COOKIE` は1行目・2行目のアカウントの `SK_OAUTH_CRED_KEY` を上から順に2行だけ書けばOKです(1アカウント目はhoyolabのみなので不要)。

## Discord Webhook

Discord Webhookを使って、チャンネルに通知を送ることができます！

1. <details>
   <summary>チャンネル設定を開く</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/80f3b2f1-cc55-4316-9153-3fc5026b7da8" />
   </details>

2. <details>
   <summary>連携サービスを開き、ウェブフックを作成をクリック</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/b4d0c07d-35a5-4382-99de-584c70c4d730" />
   </details>

3. <details>
   <summary>名前やアイコンは自由に編集し、ウェブフックURLをコピーします</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/3df5b59c-edc9-4884-897c-9159e243598e" />
   </details>

4. <details>
   <summary>新しいリポジトリ<em>変数</em>を作成し、名前を <code>DISCORD_WEBHOOK</code>、値をウェブフックURLにします</summary>
   <img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/15b029ff-906d-472c-b356-ae9efed4477b" />
   </details>

5. <details>
   <summary>(任意) チェックイン時にメンションされたい場合は、`DISCORD_USER` 変数にDiscord IDを追加してください。</summary>
   <img src="https://github.com/user-attachments/assets/995a4b18-4c22-4dcd-9a2e-90fac74079c1" />
   <img src="https://github.com/user-attachments/assets/52dff051-abb4-4cc0-b834-685d49a06731" />
   </details>

6. 手動でチェックインをトリガーして、メッセージが届くか確認してみましょう

## よくある質問

### これは安全ですか？

問題ないはずです。自動チェックインは何年も前から存在しており、Hoyoがこれに対して何らかの対応を行ったという報告はありません。

### (フォークした)リポジトリのバージョンを更新するには？

<details>
<summary>自分のリポジトリを開き、Sync fork をクリック</summary>
<img src="https://github.com/sglkc/hoyolab-auto-daily/assets/31957516/08c10262-8a97-433b-b499-143cc116184d" />
</details>

### 「ログインしていません」エラー

Cookieを正しく取得できているように見えても、これはよくある問題です。以下の別の方法でCookieを取得してみてください:

https://gist.github.com/torikushiii/59eff33fc8ea89dbc0b2e7652db9d3fd

内容をすべてコピーして `COOKIE` シークレットに貼り付けてください。

### その他の問題がある場合

[Issuesページ](https://github.com/sglkc/hoyolab-auto-daily/issues) へどうぞ
