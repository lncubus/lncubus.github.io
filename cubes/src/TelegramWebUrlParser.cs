using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class TelegramWebUrlParser
{
    public readonly Uri Uri;
    public readonly TelegramSessionData tgSessionData;
    
    public bool IsValidUrl => Uri != null;
    public bool HasSessionData => tgSessionData?.tgWebAppData?.user?.id != null;

    // private readonly List<string> _errors = new List<string>();
    // public IList<string> Errors => _errors.AsReadOnly();
    
    [Serializable]
    public class WebUserData
    {
        public string id;
        public string first_name;
        public string last_name;
        public string username;
        public string language_code;
        public bool is_premium;
        public bool allows_write_to_pm;
        public string photo_url;
    }
    
    [Serializable]
    public class WebAppData
    {
        public WebUserData user;
        public string chat_instance;
        public string chat_type;
        public string auth_date;
        public string signature;
        public string hash;
    }

    [Serializable]
    public class TelegramSessionData
    {
        public string tgWebAppVersion;
        public string tgWebAppPlatform;
        public string tgWebAppBotInline;
        public WebAppData tgWebAppData;
        public IDictionary<string, string> tgWebAppThemeParams;
    }

    private static readonly string[] _at = new[] { "&" };
    private static readonly string[] _eq = new[] { "=" };
    private static readonly string[] _comma = new[] { "," };
    private static readonly string[] _colon = new[] { ":" };

    public TelegramWebUrlParser()
    {
        try
        {
            Uri = new Uri(Application.absoluteURL);
            var session = new TelegramSessionData();
            var fragments = Uri.Fragment.Split(_at, StringSplitOptions.RemoveEmptyEntries);
            foreach (var fragment in fragments)
            {
                var pair = fragment.Split(_eq, StringSplitOptions.RemoveEmptyEntries);
                // invalid fragment
                if (pair.Length != 2)
                    continue;
                if (pair[0].StartsWith("#", StringComparison.Ordinal))
                    pair[0] = pair[0].Substring(1);
                switch (pair[0])
                {
                    case nameof(TelegramSessionData.tgWebAppVersion):
                        session.tgWebAppVersion = pair[1];
                        break;
                    case nameof(TelegramSessionData.tgWebAppPlatform):
                        session.tgWebAppPlatform = pair[1];
                        break;
                    case nameof(TelegramSessionData.tgWebAppBotInline):
                        session.tgWebAppBotInline = pair[1];
                        break;
                    case nameof(TelegramSessionData.tgWebAppThemeParams):
                        session.tgWebAppThemeParams = ParseDictionary(
                            Uri.UnescapeDataString(pair[1]), _comma, _colon).
                            ToDictionary(p => p.Key, p => p.Value);
                        break;
                    case nameof(TelegramSessionData.tgWebAppData):
                        session.tgWebAppData = ParseWebAppData(pair[1]);
                        break;
                    default:
                        Debug.Log(string.Join(" = ", pair));
                        break;
                }
            }

            if (session.tgWebAppData?.user != null)
                tgSessionData = session;
        }
        catch
        {
            Uri = null;
            tgSessionData = null;
        }
    }
    
    private WebUserData ParseWebUserData(string contents)
    {
        contents = Uri.UnescapeDataString(contents);
        var result = new WebUserData();
        // Here we can have "&":," as a first or last name, so we need to be careful
        var okay = FindLast(
            contents,
            "\"" + nameof(WebUserData.username) + "\"",
            ",\"" + nameof(WebUserData.photo_url) + "\"",
            out var begin_tail, out var end_tail);
        if (!okay)
            return null;
        var tail = contents.Substring(begin_tail, end_tail - begin_tail);
        okay = FindFirst(
            contents,
            "{", ",",
            out var begin_head, out var end_head);
        if (!okay)
            return null;
        var head = contents.Substring(begin_head + 1, end_head - begin_head);
        var body = head + tail;
        var entries = ParseDictionary(body, _comma, _colon);
        foreach (var pair in entries)
        {
            switch (pair.Key)
            {
                case nameof(WebUserData.username):
                    result.username = pair.Value;
                    break;
                case nameof(WebUserData.id):
                    result.id = pair.Value;
                    break;
                case nameof(WebUserData.language_code):
                    result.language_code = pair.Value;
                    break;
                case nameof(WebUserData.is_premium):
                    bool.TryParse(pair.Value, out result.is_premium);
                    break;
                case nameof(WebUserData.allows_write_to_pm):
                    bool.TryParse(pair.Value, out result.allows_write_to_pm);
                    break;
                default:
                    Console.Error.WriteLine(pair.Key + " = " + pair.Value);
                    break;
            }            
        }
        
        return result;
    }
    
    private WebAppData ParseWebAppData(string contents)
    {
        contents = Uri.UnescapeDataString(contents);
        var entries = ParseDictionary(contents, _at, _eq);
        var result = new WebAppData();
        foreach (var pair in entries)
        {
            switch (pair.Key)
            {
                case nameof(WebAppData.auth_date):
                    result.auth_date = pair.Value;
                    break;
                case nameof(WebAppData.chat_instance):
                    result.chat_instance = pair.Value;
                    break;
                case nameof(WebAppData.chat_type):
                    result.chat_type = pair.Value;
                    break;
                case nameof(WebAppData.hash):
                    result.hash = pair.Value;
                    break;
                case nameof(WebAppData.signature):
                    result.signature = pair.Value;
                    break;
                case nameof(WebAppData.user):
                    result.user = ParseWebUserData(pair.Value);
                    break;
                default:
                    Console.Error.WriteLine(pair.Key + " = " + pair.Value);
                    break;
            } 
        }
        return result;
    }

    private static string Unquote(string s)
    {
        if (!s.StartsWith("\"", StringComparison.Ordinal) ||
            !s.EndsWith("\"", StringComparison.Ordinal))
            return s;
        return s.Substring(1, s.Length - 2);
    }
    
    private static IEnumerable<KeyValuePair<string, string>> ParseDictionary(string contents,
        string[] delimiters, string[] equals)
    {
        if (contents.StartsWith("{", StringComparison.Ordinal) &&
            contents.EndsWith("}", StringComparison.Ordinal))
        {
            contents = contents.Substring(1, contents.Length - 2);
        }
        var entries = contents.Split(delimiters, StringSplitOptions.RemoveEmptyEntries);
        foreach (var entry in entries)
        {
            var pair = entry.Split(equals, StringSplitOptions.RemoveEmptyEntries);
            if (pair.Length != 2)
                continue;
            yield return new KeyValuePair<string, string>(Unquote(pair[0]), Unquote(pair[1]));
        }
    }

    private static bool FindFirst(string contents, string begins, string ends, out int begin, out int end)
    {
        begin = contents.IndexOf(begins, StringComparison.Ordinal);
        if (begin == -1)
        {
            end = -1;
            return false;
        }
        end = contents.IndexOf(ends, begin + begins.Length, StringComparison.Ordinal);
        if (end == -1)
        {
            begin = -1;
            return false;
        }
        return true;
    }

    private static bool FindLast(string contents, string begins, string ends, out int begin, out int end)
    {
        end = contents.LastIndexOf(ends, StringComparison.Ordinal);
        if (end == -1)
        {
            begin = -1;
            return false;
        }
        begin = contents.LastIndexOf(begins, end, StringComparison.Ordinal);
        if (begin == -1)
        {
            end = -1;
            return false;
        }
        return true;
    }
    
}
