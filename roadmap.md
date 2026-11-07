# V1.0: Household cash-flow clarity

## Product promise

Help a household understand what it spent, what it still plans to spend, and where it can adjust before the month ends.

## First release focus

- Import Google Pay statements on-device, review extracted transactions, prevent repeat imports, and identify imported rows.
- Set a month-specific spending limit and compare it with recorded expenses.
- Surface scheduled loan payments already tracked in the app, without counting them as expenses a second time.
- Keep manual entry available for cash and other transactions.

## Next product milestones

- [x] Import bank CSV statements with editable review rows, possible-duplicate handling, and row-count/debit/credit reconciliation before saving.
- Create a household space with member attribution, clear sharing controls, and private transactions.
- Add recurring household bills and a cash-flow outlook that combines bills, loan payments, and income.

## Ship checks

- Validate statement imports against different Google Pay statement periods and layouts.
- Verify Firestore access rules for transaction, budget, and loan data.
- Check sign-in, first-use setup, import review, editing, duplicate handling, and mobile layouts with real beta users.
