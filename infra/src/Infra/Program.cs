using Amazon.CDK;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Infra
{
    sealed class Program
    {
        public static void Main(string[] args)
        {
            var app = new App();
            string environmentInput = (string)app.Node.TryGetContext("env") ?? "development";
            // Normalize environment name
            string env = environmentInput.ToLower() switch
            {
                "production" => "prod",
                "development" => "dev",
                "testing" => "test",
                _ => environmentInput.ToLower() // fallback to original if unrecognized
            };

            Console.WriteLine($"Deploying to Environment: {env}");

            string accountId = (string)app.Node.TryGetContext("accountId");
            Console.WriteLine($"AccountID: {accountId}");

            new CloudfrontStack(app, $"MallientVerify-{env}", env, new StackProps
            {
                Env = new Amazon.CDK.Environment
                {
                    Account = accountId,
                    Region = "us-east-1"
                }
            });
            app.Synth();
        }
    }
}
