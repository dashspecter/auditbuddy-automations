

## Bug: "Cannot access 'templateId' before initialization"

The error is a **variable ordering issue** in `WhatsAppBroadcast.tsx`.

On **line 19**, `templateId` is used in `.find()`:
```js
const selectedTemplate = approvedTemplates.find((t: any) => t.id === templateId);
```

But `templateId` is declared later on **line 22**:
```js
const [templateId, setTemplateId] = useState('');
```

JavaScript's temporal dead zone prevents accessing a `let`/`const` variable before its declaration, causing the crash.

## Fix

Move `selectedTemplate` and `missingContentSid` declarations **after** the `useState` calls (after line 23). One simple reorder, no logic changes needed.

