using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.CDK;
using Amazon.CDK.AWS.Apigatewayv2;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.S3.Deployment;
using Constructs;

namespace Infra
{
    public class CloudfrontStack : MallientStack
    {
        internal CloudfrontStack(Construct scope, string id, string envName, IStackProps props = null)
            : base(scope, id, envName, props)
        {
            var siteBucket = new Bucket(this, $"MVSiteBucket-{envName}", new BucketProps
            {
                BucketName = $"mallient-verify-ui-bucket-{envName}",
                PublicReadAccess = false,
                RemovalPolicy = RemovalPolicy.DESTROY,
                AutoDeleteObjects = true,
                BlockPublicAccess = BlockPublicAccess.BLOCK_ALL
            });

            var oai = new OriginAccessIdentity(this, $"OAI-{envName}", new OriginAccessIdentityProps
            {
                Comment = $"OAI for {envName}"
            });

            // Cache behavior for hashed assets — cached forever at the edge
            var assetsCachePolicyProps = new CachePolicyProps
            {
                CachePolicyName = $"MalllientAssets-{envName}",
                DefaultTtl = Duration.Days(365),
                MaxTtl = Duration.Days(365),
                MinTtl = Duration.Days(365),
                EnableAcceptEncodingGzip = true,
                EnableAcceptEncodingBrotli = true,
                QueryStringBehavior = CacheQueryStringBehavior.None(),
                HeaderBehavior = CacheHeaderBehavior.None(),
                CookieBehavior = CacheCookieBehavior.None()
            };
            var assetsCachePolicy = new CachePolicy(this, $"AssetsCachePolicy-{envName}", assetsCachePolicyProps);

            // Cache behavior for index.html — never cache at the edge
            var htmlCachePolicyProps = new CachePolicyProps
            {
                CachePolicyName = $"MallientHtml-{envName}",
                DefaultTtl = Duration.Seconds(0),
                MaxTtl = Duration.Seconds(0),
                MinTtl = Duration.Seconds(0),
                EnableAcceptEncodingGzip = true,
                EnableAcceptEncodingBrotli = true,
                QueryStringBehavior = CacheQueryStringBehavior.None(),
                HeaderBehavior = CacheHeaderBehavior.None(),
                CookieBehavior = CacheCookieBehavior.None()
            };
            var htmlCachePolicy = new CachePolicy(this, $"HtmlCachePolicy-{envName}", htmlCachePolicyProps);

            var s3Origin = new S3Origin(siteBucket, new S3OriginProps
            {
                OriginAccessIdentity = oai
            });

            var distribution = new Distribution(this, $"MCSiteDistribution-{envName}", new DistributionProps
            {
                // index.html as default root — governed by the default behavior below
                DefaultRootObject = "index.html",

                // Default behavior covers index.html and everything not matched
                // by an additional behavior — no-cache policy applied here
                DefaultBehavior = new BehaviorOptions
                {
                    Origin = s3Origin,
                    ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                    CachedMethods = CachedMethods.CACHE_GET_HEAD_OPTIONS,
                    CachePolicy = htmlCachePolicy,
                    OriginRequestPolicy = OriginRequestPolicy.CORS_S3_ORIGIN
                },

                // Additional behavior for hashed assets — long-lived cache
                AdditionalBehaviors = new Dictionary<string, IBehaviorOptions>
                {
                    ["/assets/*"] = new BehaviorOptions
                    {
                        Origin = s3Origin,
                        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                        AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                        CachedMethods = CachedMethods.CACHE_GET_HEAD_OPTIONS,
                        CachePolicy = assetsCachePolicy,
                        OriginRequestPolicy = OriginRequestPolicy.CORS_S3_ORIGIN
                    }
                },

                // SPA fallback — 403/404 from S3 serve index.html with no caching
                ErrorResponses = new IErrorResponse[]
                {
                    new ErrorResponse
                    {
                        HttpStatus         = 403,
                        ResponseHttpStatus = 200,
                        ResponsePagePath   = "/index.html",
                        Ttl                = Duration.Seconds(0)
                    },
                    new ErrorResponse
                    {
                        HttpStatus         = 404,
                        ResponseHttpStatus = 200,
                        ResponsePagePath   = "/index.html",
                        Ttl                = Duration.Seconds(0)
                    }
                }
            });

            // Deploy hashed assets — cache forever, invalidate rarely
            new BucketDeployment(this, $"MCDeployAssets-{envName}", new BucketDeploymentProps
            {
                Sources = new[] { Source.Asset("../app/dist") },
                DestinationBucket = siteBucket,
                DestinationKeyPrefix = "",
                Exclude = new[] { "index.html" },
                CacheControl = new[]
                {
                    CacheControl.SetPublic(),
                    CacheControl.MaxAge(Duration.Days(365)),
                    CacheControl.FromString("immutable")
                },
                Prune = false,
                Distribution = distribution,
                DistributionPaths = new[] { "/assets/*" }
            });

            // Deploy index.html separately — no-cache headers, invalidate on every deploy
            new BucketDeployment(this, $"MCDeployHtml-{envName}", new BucketDeploymentProps
            {
                Sources = new[] { Source.Asset("../app/dist") },
                DestinationBucket = siteBucket,
                DestinationKeyPrefix = "",
                Include = new[] { "index.html" },
                CacheControl = new[]
                {
                    CacheControl.NoCache(),
                    CacheControl.NoStore(),
                    CacheControl.MustRevalidate()
                },
                Prune = false,
                Distribution = distribution,
                DistributionPaths = new[] { "/index.html" }
            });

            new CfnOutput(this, $"MCCloudFrontURL-{envName}", new CfnOutputProps
            {
                Value = $"https://{distribution.DomainName}",
                Description = $"The CloudFront distribution URL for {envName}",
                ExportName = $"MCCloudFrontURL-{envName}"
            });
        }
    }
}