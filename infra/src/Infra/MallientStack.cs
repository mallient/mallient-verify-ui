using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.CDK;
using Constructs;

namespace Infra
{
    public class MallientStack : Stack
    {
        public string _envName { get; set; }

        public MallientStack(Construct scope, string id, string envName, IStackProps props = null)
                    : base(scope, id, props)
        {
            _envName = envName;
        }
    }
}
