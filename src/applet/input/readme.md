This app renders a simple input form.
It's an easy way to call a certain URL with the given parameters.
The response is received but silently discarded.

Configuration usage:

app : "input",
opt : {
  title  : "The input form title",
  prompt : "Prompt",
  url    : "http://target_url",
  item   : [
    {
      name  : "Item 1 name",
      param : "url param",
      value : "default value",
      flag  : "P"
    },
    {
      name  : "Item 2 name",
      param : "url param",
      value : "default value",
      flag  : "P"
    },
    {
      name  : "Item 3 name",
      param : "url param",
      value : "default value",
      flag  : "P"
    }
  ]
}

