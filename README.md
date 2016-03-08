# slack-pr-notifier
Slack notifications for Jenkins Github PR Builder plugin.
### User Mappings
The mappings.json file is used to map slack user accounts to corresponding github accounts. The format is
```
"<SLACK ACCOUNT EMAIL>": "<GITHUB ACCOUNT EMAIL>"
```
This allows mapping an additional github account to a single slack account (assuming the user has a github account under the same email associated with slack in addition to a seperate account).
